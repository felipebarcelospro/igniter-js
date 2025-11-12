import { Command } from 'commander';
import { handleDevAction } from './action';

export const devCommand = new Command()
  .command('dev')
  .description('Start development mode with automatic schema and docs regeneration')
  .option('--router <path>', 'Path to the router file', 'src/igniter.router.ts')
  .option('--output <path>', 'Output path for the schema file', 'src/igniter.schema.ts')
  .option('--docs-output <dir>', 'Output directory for the OpenAPI spec', './src/docs')
  .option('--cmd <command>', 'Custom command to start the development server')
  .action(handleDevAction);

