import { Command } from 'commander';
import { handleGenerateFeatureAction } from './action';

export const featureCommand = new Command()
  .command('feature')
  .description('Scaffold a new feature module')
  .argument('[name]', 'The name of the feature (e.g., "user", "products")')
  .option('--schema <value>', 'Generate from a schema provider (e.g., "prisma:User")')
  .option('--schema-path <path>', 'Custom schema path for the selected provider')
  .action(handleGenerateFeatureAction);
