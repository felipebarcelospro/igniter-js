import { OpenAPIGenerator } from '@/core/openapi';
import { RouterInstrospector } from '@/core/router-instrospector';
import * as p from '@clack/prompts';
import * as fs from 'fs';
import * as path from 'path';

export interface DocsGenerationResult {
  durationMs: number;
  sizeKb: number;
  outputPath: string;
}

export async function generateDocsWatchMode(routerPath: string, outputDir: string): Promise<DocsGenerationResult> {
  const startTime = Date.now();

  const outputDirFull = path.resolve(outputDir);
  if (!fs.existsSync(outputDirFull)) {
    fs.mkdirSync(outputDirFull, { recursive: true });
  }

  const outputPath = path.join(outputDirFull, 'openapi.json');

  // Se o arquivo openapi.json não existir, pode criar
  if (!fs.existsSync(outputPath)) {
    fs.writeFileSync(outputPath, '{}', 'utf8'); // Garante que o arquivo seja criado vazio antes de popular
  }

  const routerInstrospector = RouterInstrospector.create();
  const router = await routerInstrospector.loadRouter(routerPath);

  if (!router) {
    throw new Error(`Router not found at: ${routerPath}`);
  }

  if (!router.config.docs) {
    throw new Error('Router does not have docs configuration');
  }

  const openapiGenerator = OpenAPIGenerator.create(router.config.docs);
  const openapi = openapiGenerator.generate(router);

  fs.writeFileSync(outputPath, JSON.stringify(openapi, null, 2), 'utf8');

  const sizeKb = fs.statSync(outputPath).size / 1024;

  return {
    durationMs: Date.now() - startTime,
    sizeKb,
    outputPath,
  };
}

export async function handleGenerateDocsAction(options: { router: string; output: string }) {
  try {
    p.intro('Generate OpenAPI documentation');

    const spinner = p.spinner();
    spinner.start('Generating OpenAPI documentation...');

    const result = await generateDocsWatchMode(options.router, options.output);

    spinner.stop('OpenAPI documentation generated successfully.');
    p.log.success(
      `Docs generated in ${(result.durationMs / 1000).toFixed(2)}s (${result.sizeKb.toFixed(1)} KB)`,
    );
    p.log.info('Test your API on Igniter Studio at:  http://localhost:3000/api/v1/docs');
    process.exit(0);
  } catch (error) {
    p.log.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
