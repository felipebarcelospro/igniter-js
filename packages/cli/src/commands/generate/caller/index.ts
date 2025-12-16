import { Command } from "commander";
import { handleGenerateCallerAction } from "./action";

export const callerCommand = new Command()
  .command("caller")
  .description("Generate Igniter Caller schemas from an OpenAPI spec")
  .option("--name <name>", "Name used to prefix generated schemas and caller export")
  .option("--url <url>", "URL to the OpenAPI document")
  .option("--path <path>", "Local path to the OpenAPI document")
  .option(
    "--output <path>",
    "Output directory (defaults to src/callers/<hostname>)",
  )
  .action(handleGenerateCallerAction);
