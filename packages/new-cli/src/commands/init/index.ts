import { Command } from "commander";
import { handleInitAction } from "./action";

export const initCommand = new Command()
  .command("init")
  .description("Create a new Igniter.js project with interactive setup")
  .argument("[project-name]", "Name of the project directory")
  .option("--mode <mode>", "Mode to use (install, new-project)", "new-project")
  .option(
    "--pm, --package-manager <manager>",
    "Package manager to use (npm, yarn, pnpm, bun)",
  )
  .option(
    "--template <template>",
    "Use a specific template (e.g., starter-nextjs, starter-express-rest-api)",
  )
  .option(
    "--add-ons <add-ons>",
    "Comma-separated list of add-ons (store,jobs,mcp,logging,telemetry)",
  )
  .option(
    "--database <database>",
    "Database provider (none, postgresql, mysql, sqlite)",
  )
  .option("--no-git", "Skip git repository initialization")
  .option("--no-install", "Skip automatic dependency installation")
  .option("--no-docker", "Skip Docker Compose setup")
  .action(handleInitAction);
