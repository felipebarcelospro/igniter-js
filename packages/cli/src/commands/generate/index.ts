import { Command } from 'commander';
import { featureCommand } from './feature';
import { docsCommand } from './docs';
import { schemaCommand } from './schema';
import { controllerCommand } from './controller';
import { procedureCommand } from './procedure';
import { callerCommand } from './caller';

export const generateCommand = new Command()
  .command('generate')
  .description('Scaffold new features or generate client schema')
  .addCommand(featureCommand)
  .addCommand(controllerCommand)
  .addCommand(procedureCommand)
  .addCommand(docsCommand)
  .addCommand(schemaCommand)
  .addCommand(callerCommand);
