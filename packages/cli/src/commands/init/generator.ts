import { ProjectSetupConfig } from "./types";
import { createLogger } from "../../core/logger";
import * as p from "@clack/prompts";
import { execa } from "execa";
import { getInstallCommand } from "../../core/package-manager";
import { starterRegistry } from "@/registry/starters";
import { addOnRegistry } from "@/registry/add-ons";

const logger = createLogger("ProjectGenerator");

export class ProjectGenerator {
  private config: ProjectSetupConfig;
  private targetDir: string;

  constructor(config: ProjectSetupConfig, targetDir: string) {
    this.config = config;
    this.targetDir = targetDir;
  }

  public async generate() {
    // 1. Create project structure
    await this.setupProject();

    // 2. Apply add-ons (templates, env vars, docker services)
    await this.setupAddOns();

    // 3. Install dependencies
    if (this.config.installDependencies) await this.installDependencies();

    // 4. Initialize Docker services
    if (this.config.initDocker) await this.setupDocker();

    // 5. Initialize Git repository
    if (this.config.initGit) await this.setupGit();

    // 6. Run add-on post-install steps LAST (requires deps installed)
    if (this.config.installDependencies) {
      await this.runPostInstallSteps();
    } else {
      p.log.warn(
        "Skipping add-on post-install steps because dependencies were not installed.",
      );
    }
  }

  private async installDependencies(): Promise<void> {
    const installer = p.spinner();

    try {
      installer.start("Installing dependencies...");
      const { command, args } = getInstallCommand(this.config.packageManager);
      await execa(command, args, { cwd: this.targetDir, stdio: "pipe" });
      installer.stop("Dependencies installed successfully!");
    } catch (error) {
      installer.stop("Failed to install dependencies.");
      logger.error("Dependency installation failed", { error });
      p.log.warn("Please install dependencies manually.");
    }
  }

  private async setupProject(): Promise<void> {
    const starter = this.config.starter
      ? starterRegistry.get(this.config.starter)
      : undefined;
    if (!starter) {
      p.log.error("Starter not found");
      process.exit(1);
    }

    const projectGenerator = p.spinner();
    projectGenerator.start("Generating project structure...");
    await starter.install(this.targetDir, this.config);
    projectGenerator.stop("Project structure generated successfully!");
  }

  private async setupAddOns(): Promise<void> {
    const selectedAddOns = this.config.addOns || [];
    if (selectedAddOns.length === 0) return;

    const addOns = addOnRegistry.getMany(selectedAddOns);

    for (const addOn of addOns) {
      const addOnSetup = p.spinner();
      addOnSetup.start(`Setting up ${addOn.name}...`);
      try {
        // runSetup() applies assets (package.json, env, docker, templates)
        await addOn.runSetup(this.targetDir, this.config);
        addOnSetup.stop(`${addOn.name} setup completed!`);
      } catch (error) {
        addOnSetup.stop(`Failed to setup ${addOn.name}.`);
        logger.error(`Add-on setup failed for ${addOn.name}`, { error });
      }
    }
  }

  // Run add-on post-install steps after dependencies are installed
  private async runPostInstallSteps(): Promise<void> {
    const selectedAddOns = this.config.addOns || [];
    if (selectedAddOns.length === 0) return;

    const addOns = addOnRegistry.getMany(selectedAddOns);

    for (const addOn of addOns) {
      const setupSpinner = p.spinner();
      setupSpinner.start(`Running post-install steps for ${addOn.name}...`);
      try {
        await addOn.runPostInstall(this.targetDir, this.config);
        setupSpinner.stop(`${addOn.name} post-install steps completed!`);
      } catch (error) {
        setupSpinner.stop(`Failed to run post-install steps for ${addOn.name}.`);
        logger.error(`Add-on post-install steps failed for ${addOn.name}`, { error });
      }
    }
  }

  private async setupGit(): Promise<void> {
    const gitSetup = p.spinner();
    gitSetup.start("Initializing Git repository...");
    try {
      await execa("git", ["init"], { cwd: this.targetDir });
      await execa("git", ["add", "."], { cwd: this.targetDir });
      await execa(
        "git",
        ["commit", "-m", "Initial commit from Igniter.js CLI"],
        { cwd: this.targetDir },
      );
      gitSetup.stop("Git repository initialized successfully!");
    } catch (error) {
      gitSetup.stop(
        "Failed to initialize Git repository. Please initialize it manually.",
      );
    }
  }

  private async setupDocker(): Promise<void> {
    const dockerSetup = p.spinner();
    dockerSetup.start("Initializing Docker services...");
    try {
      // 1. Stop all running docker containers
      await execa("docker", [
        "container",
        "stop",
        ...(await execa("docker", ["ps", "-q"])).stdout
          .split("\n")
          .filter(Boolean),
      ]);
      dockerSetup.message(
        `Checking and stopping currently running containers...`,
      );

      // 2. Find all ports used in docker-compose.yml
      const fs = await import("fs/promises");
      const path = await import("path");
      const yaml = await import("js-yaml");

      const composeFilePath = path.join(this.targetDir, "docker-compose.yml");
      let ports: number[] = [];

      try {
        const composeContent = await fs.readFile(composeFilePath, "utf8");
        const doc = yaml.load(composeContent) as any;

        const services = doc?.services || {};
        for (const svcKey of Object.keys(services)) {
          const service = services[svcKey];
          const svcPorts = service.ports || [];
          for (const portMapping of svcPorts) {
            // Supports formats like '3000:3000' and '3000'
            const [hostPortStr] = String(portMapping).split(":");
            const hostPort = parseInt(hostPortStr, 10);
            if (!isNaN(hostPort)) ports.push(hostPort);
          }
        }
        dockerSetup.message(`Found ${ports.length} ports to check.`);
      } catch (err) {
        dockerSetup.stop(
          "Failed to read docker-compose.yml. Maybe you are not using Docker Compose?",
        );
      }

      // 3. Try to kill any processes listening on those ports
      if (ports.length > 0) {
        for (const port of ports) {
          try {
            // Cross-platform port killing
            if (process.platform === "win32") {
              // Windows: find PID with netstat and kill with taskkill
              const { stdout } = await execa("netstat", ["-ano", "-p", "tcp"]);
              const lines = stdout.split("\n");
              const matching = lines.find(
                (line) =>
                  line.includes(`:${port} `) &&
                  line.trim().endsWith("LISTENING"),
              );
              if (matching) {
                const parts = matching.trim().split(/\s+/);
                const pid = parts[parts.length - 1];
                if (pid && pid !== "0") {
                  await execa("taskkill", ["/PID", pid, "/F"]);
                }
              }
            } else {
              // Unix (Linux/macOS): find PID with lsof or fuser and kill
              try {
                const { stdout } = await execa("lsof", ["-ti", `tcp:${port}`]);
                const pids = stdout.split("\n").filter(Boolean);
                for (const pid of pids) {
                  await execa("kill", ["-9", pid]);
                }
              } catch {
                // If lsof not available, fallback to fuser
                try {
                  await execa("fuser", ["-k", "-n", "tcp", `${port}`]);
                } catch {}
              }
            }
            dockerSetup.message(`Port ${port} freed successfully.`);
          } catch (e) {
            dockerSetup.stop(
              `Could not free port ${port}. Please free it manually.`,
            );
          }
        }
      }

      await execa("docker-compose", ["up", "-d"], { cwd: this.targetDir });
      dockerSetup.stop("Docker services initialized successfully!");
    } catch (error) {
      dockerSetup.stop(
        "Failed to initialize Docker services. Please initialize it manually.",
      );
    }
  }
}
