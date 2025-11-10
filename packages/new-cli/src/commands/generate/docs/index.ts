import { Command } from 'commander';
import { handleGenerateDocsAction } from './action';

export const docsCommand = new Command()
  .command('docs')
  .description('Generate OpenAPI specification')
  .option('--router <path>', 'Path to the router file', 'src/igniter.router.ts')
  .option('--output <dir>', 'Output directory for the OpenAPI spec', './src/docs')
  .action(handleGenerateDocsAction);
