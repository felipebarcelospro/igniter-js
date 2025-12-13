import { RouterInstrospector } from '@/core/router-instrospector';
import { TemplateEngine } from '@/core/template-engine';
import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';
import * as p from '@clack/prompts';

export interface SchemaGenerationResult {
  durationMs: number;
  controllers: number;
  actions: number;
}

export async function generateSchemaWatchMode(routerPath: string, outputPath: string): Promise<SchemaGenerationResult> {
  const startTime = Date.now();

  const routerInstrospector = RouterInstrospector.create();
  const router = await routerInstrospector.loadRouter(routerPath);
  const { schema, stats } = routerInstrospector.introspectRouter(router);

  const templateEngine = TemplateEngine.create();
  const templatePath = templateEngine.resolvePath('scaffold', 'igniter.schema.hbs');
  
  const schemaContent = await templateEngine.render(templatePath, {
    generatedAt: new Date().toISOString(),
    schemaString: JSON.stringify(schema, null, 2),
  });

  const outputFullPath = path.resolve(process.cwd(), outputPath);
  fs.writeFileSync(outputFullPath, schemaContent, 'utf8');

  return {
    durationMs: Date.now() - startTime,
    controllers: stats.controllers,
    actions: stats.actions,
  };
}

export async function handleGenerateSchemaAction({ router: routerPath, output: outputPath }: { router: string; output: string; watch: boolean }) {
  try {
    p.intro('Generate Igniter.js Client Schema');

    const spinner = p.spinner();
    spinner.start('Generating schema...');

    const result = await generateSchemaWatchMode(routerPath, outputPath);

    spinner.stop('Schema generated successfully.');
    p.log.success(
      `Schema generated in ${(result.durationMs / 1000).toFixed(2)}s (${result.controllers} controllers, ${result.actions} actions).`,
    );

    p.outro('All done!');
    process.exit(0);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    p.log.error(`Failed to generate schema: ${errorMessage}`);
    process.exit(1);
  }
}
