import * as path from "path";
import * as fs from "fs/promises";
import { execa } from "execa";
import { existsSync } from 'fs';
import type { RegistryAssetDependency, RegistryAssetEnvVar, RegistryAssetTemplate } from "@/registry/types";
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import handlebars from 'handlebars';
import { registerHandlebarsHelpers } from '../../handlebars-helpers';
import type { ProjectSetupConfig } from "@/commands/init/types";

export abstract class BaseStarter {
  abstract id: string;
  abstract name: string;
  abstract description: string;
  abstract hint: string;
  abstract repository: string;
  public templates: RegistryAssetTemplate[] = [
    {
      template: path.resolve(process.cwd(), 'templates/starters/igniter.router.hbs'),
      outputPath: 'src/igniter.router.ts',
    },
    {
      template: path.resolve(process.cwd(), 'templates/starters/igniter.client.hbs'),
      outputPath: 'src/igniter.client.ts',
    },
    {
      template: path.resolve(process.cwd(), 'templates/starters/igniter.context.hbs'),
      outputPath: 'src/igniter.context.ts',
    },
    {
      template: path.resolve(process.cwd(), 'templates/starters/igniter.hbs'),
      outputPath: 'src/igniter.ts',
    },
    {
      template: path.resolve(process.cwd(), 'templates/scaffold/example-feature/example.controller.hbs'),
      outputPath: 'src/features/example/controllers/example.controller.ts',
    },
    {
      template: path.resolve(process.cwd(), 'templates/scaffold/example-feature/example.procedure.hbs'),
      outputPath: 'src/features/example/procedures/example.procedure.ts',
    },
    {
      template: path.resolve(process.cwd(), 'templates/scaffold/example-feature/example.interfaces.hbs'),
      outputPath: 'src/features/example/example.interfaces.ts',
    },
    {
      template: path.resolve(process.cwd(), 'templates/starters/open-api.hbs'),
      outputPath: 'src/docs/openapi.json',
    },
  ];
  public dependencies: RegistryAssetDependency[] = [
    { name: '@igniter-js/core', version: 'latest', type: 'dependency' },
  ];
  public envVars: RegistryAssetEnvVar[] = [
    { key: 'IGNITER_APP_NAME', value: 'My App', description: 'Application name' },
    { key: 'IGNITER_APP_SECRET', value: 'my-secret-key', description: 'Application secret' },
    { key: 'IGNITER_API_BASE_PATH', value: '/api/v1', description: 'API base path' },
  ];

  /**
   * Install the starter
   */
  public async install(targetDir: string, options: ProjectSetupConfig): Promise<void> {
    if(options.mode === 'install') {
      await this.createProjectStructure(targetDir, options);
    } else {
      await this.download({ targetDir });
    }
  }

  /**
   * Create the project structure
   */
  private async createProjectStructure(targetDir: string, options: ProjectSetupConfig): Promise<void> {
    await this.addToPackageJson(targetDir);
    await this.addToEnvFile(targetDir);
    await this.renderTemplates(targetDir, options);
  }

  /**
   * Add dependencies to package.json file
   */
  private async addToPackageJson(projectDir: string): Promise<void> {
    const packageJsonPath = join(projectDir, 'package.json');

    let packageJson: any = {};
    if (existsSync(packageJsonPath)) {
      const content = await readFile(packageJsonPath, 'utf-8');
      packageJson = JSON.parse(content);
    }

    const dependencies = this.dependencies || [];
    const deps = dependencies.filter(d => d.type === 'dependency');
    const devDeps = dependencies.filter(d => d.type === 'devDependency');

    // Add regular dependencies (avoid duplicates)
    if (deps.length > 0) {
      packageJson.dependencies = packageJson.dependencies || {};
      deps.forEach(dep => {
        if (!packageJson.dependencies[dep.name]) {
          packageJson.dependencies[dep.name] = dep.version;
        }
      });
    }

    // Add dev dependencies (avoid duplicates)
    if (devDeps.length > 0) {
      packageJson.devDependencies = packageJson.devDependencies || {};
      devDeps.forEach(dep => {
        if (!packageJson.devDependencies[dep.name]) {
          packageJson.devDependencies[dep.name] = dep.version;
        }
      });
    }

    await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
  }

  /**
   * Add environment variables to .env file
   */
  private async addToEnvFile(projectDir: string): Promise<void> {
    const envPath = join(projectDir, '.env');

    let envContent = '';
    if (existsSync(envPath)) {
      envContent = await readFile(envPath, 'utf-8');
    }

    // Parse existing env vars to avoid duplicates
    const existingVars = new Set<string>();
    const lines = envContent.split('\n');
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const key = trimmed.split('=')[0];
        existingVars.add(key);
      }
    });

    const envVars = this.envVars || [];

    if (envVars.length > 0) {
      // Only add new env vars
      const newVars = envVars.filter(envVar => !existingVars.has(envVar.key));

      if (newVars.length > 0) {
        if (envContent && !envContent.endsWith('\n\n')) {
          envContent += '\n';
        }

        newVars.forEach(envVar => {
          if (envVar.description) {
            envContent += `# ${envVar.description}\n`;
          }
          envContent += `${envVar.key}=${envVar.value}\n\n`;
        });
      }
    }

    if (envContent.trim()) {
      await writeFile(envPath, envContent);
    }
  }

  /**
   * Render and create template files
   */
  private async renderTemplates(projectDir: string, data: ProjectSetupConfig): Promise<void> {
    // Register Handlebars helpers
    registerHandlebarsHelpers();

    const templates = this.templates || [];

    for (const template of templates) {
      try {
        // If template.template is a function, call it with the data
        if (typeof template.template === 'function') {
          template.template = template.template(data);
        }

        // Read template file
        const templateContent = await readFile(template.template as string, 'utf-8');

        // Compile and render template
        const compiledTemplate = handlebars.compile(templateContent);
        const renderedContent = compiledTemplate(data);

        // If template.outputPath is a function, call it with the data
        if (typeof template.outputPath === 'function') {
          template.outputPath = template.outputPath(data);
        }

        // Write to output path
        const outputPath = join(projectDir, template.outputPath);
        const outputDir = join(outputPath, '..');

        // Ensure output directory exists
        await import('fs').then(fs => {
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }
        });

        // Always overwrite the file if it already exists
        await writeFile(outputPath, renderedContent); // writeFile will overwrite by default
      } catch (error) {
        console.error(error);
        throw new Error(`Failed to render template ${template.template}: ${error}`);
      }
    }
  }

  /**
   * Download the starter template from the repository or path.
   *
   * Possible formats for this.repository:
   *  - "my-template" (relative path inside igniter-js repository)
   *  - "felipebarcelospro/igniter-js/path/to/template" (path inside public repo)
   *  - "org/repo" (entire public repository)
   *  - "org/repo/path" (a subpath inside a public repository)
   *  - "https://github.com/org/repo.git" (whole repository, main branch)
   *  - "https://github.com/org/repo.git#branch:path" (custom branch & path)
   */
  private async download({ targetDir }: { targetDir: string }): Promise<void> {
    const starter = this.repository
    const templateUrl = `https://github.com/felipebarcelospro/igniter-js.git`
    const branch = 'main'
    const tempDir = path.join(targetDir, '__igniter_tmp__')
    const starterDir = path.join(tempDir, 'apps', starter)
    const destDir = targetDir


    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {})
    await execa('git', [
      'clone',
      '--depth', '1',
      '--branch', branch,
      '--single-branch',
      templateUrl,
      tempDir
    ])
    
    const stat = await fs.stat(starterDir).catch(() => null)
    if (!stat || !stat.isDirectory()) {
      throw new Error(`Starter directory '${starter}' not found in the repository.`)
    }

    const copyRecursive = async (src: string, dest: string) => {
      const entries = await fs.readdir(src, { withFileTypes: true })
      for (const entry of entries) {
        const srcPath = path.join(src, entry.name)
        const destPath = path.join(dest, entry.name)
        if (entry.isDirectory()) {
          await fs.mkdir(destPath, { recursive: true })
          await copyRecursive(srcPath, destPath)
        } else if (entry.isFile()) {
          await fs.copyFile(srcPath, destPath)
        }
      }
    }

    await copyRecursive(starterDir, destDir)

    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {})
  }
}
