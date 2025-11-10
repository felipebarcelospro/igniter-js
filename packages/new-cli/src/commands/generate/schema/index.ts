import { Command } from 'commander';
import { handleGenerateSchemaAction } from './action';

export const schemaCommand = new Command()
    .command('schema')
    .description('Generate client schema from your API router')
    .option('--router <path>', 'Path to the router file', 'src/igniter.router.ts')
    .option('--output <path>', 'Output path for the schema file', 'src/igniter.schema.ts')
    .action(handleGenerateSchemaAction);
