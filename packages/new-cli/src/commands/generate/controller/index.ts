import { Command } from "commander";
import { handleGenerateControllerAction } from "./action";

export const controllerCommand = new Command()
  .command("controller")
  .description("Scaffold a new controller within a feature")
  .argument("<name>", "Name of the controller (e.g., 'profile')")
  .option("-f, --feature <feature>", "Target feature name")
  .action(handleGenerateControllerAction);
