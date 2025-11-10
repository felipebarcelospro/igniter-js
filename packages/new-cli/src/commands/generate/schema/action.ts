import { RouterInstrospector } from '@/core/router-instrospector';
import { FileWatcher } from '@/core/watcher';
import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';
import * as p from '@clack/prompts';

export async function handleGenerateSchemaAction({ router: routerPath, output: outputPath }: { router: string; output: string; watch: boolean }) {
  try {
    p.intro('Generate Igniter.js Client Schema');

  const startTime = Date.now();

  const routerLoaderSpinner = p.spinner();
  routerLoaderSpinner.start('Loading your API router...');
  const routerInstrospector = RouterInstrospector.create();
  const router = await routerInstrospector.loadRouter(routerPath);
  routerLoaderSpinner.stop('Router loaded successfully.');

  const introspectSpinner = p.spinner();
  introspectSpinner.start('Introspecting router...');
  const { schema, stats } = routerInstrospector.introspectRouter(router);
  introspectSpinner.stop(`Introspection complete. Found ${stats.controllers} controllers and ${stats.actions} actions.`);

  const templateSpinner = p.spinner();
  templateSpinner.start('Generating schema from template...');
  const templatePath = path.resolve(__dirname, '../templates/scaffold/igniter.schema.hbs');
  const templateSource = fs.readFileSync(templatePath, 'utf8');
  const template = handlebars.compile(templateSource);
  const schemaContent = template({
    generatedAt: new Date().toISOString(),
    schemaString: JSON.stringify(schema, null, 2),
  });
  templateSpinner.stop('Schema content generated.');

  const writeFileSpinner = p.spinner();
  const outputFullPath = path.resolve(process.cwd(), outputPath);
  writeFileSpinner.start(`Saving schema to ${outputFullPath}...`);
  fs.writeFileSync(outputFullPath, schemaContent, 'utf8');
  writeFileSpinner.stop('Schema saved successfully.');

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
  p.log.success(`Schema generated in ${totalTime} seconds.`);  

  p.outro('All done!');
  process.exit(0);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    p.log.error(`Failed to generate schema: ${errorMessage}`);
    process.exit(1);
  }
}
