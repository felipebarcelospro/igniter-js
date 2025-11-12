import { Command } from "commander";
import { handleGenerateProcedureAction } from "./action";

export const procedureCommand = new Command()
  .command("procedure")
  .description("Scaffold a new procedure within a feature")
  .argument("[name]", "Name of the procedure (e.g., 'profile')")
  .option("-f, --feature <feature>", "Target feature name")
  .action(handleGenerateProcedureAction);
