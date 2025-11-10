import { Command } from 'commander';
import { initCommand } from './commands/init';
import { generateCommand } from './commands/generate';

const program = new Command();

program
  .name("igniter")
  .description("The next-generation command-line interface for Igniter.js")
  .version("0.0.1");

program.addCommand(initCommand);
program.addCommand(generateCommand);

program.parse(process.argv);
