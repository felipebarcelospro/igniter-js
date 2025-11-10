import { Command } from 'commander';
import { featureCommand } from './feature';
import { docsCommand } from './docs';
import { schemaCommand } from './schema';

export const generateCommand = new Command()
  .command('generate')
  .description('Scaffold new features or generate client schema')
  .addCommand(featureCommand)
  .addCommand(docsCommand)
  .addCommand(schemaCommand);
