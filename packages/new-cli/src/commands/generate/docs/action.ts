import { OpenAPIGenerator } from '@/core/openapi';
import { RouterInstrospector } from '@/core/router-instrospector';
import * as p from '@clack/prompts';
import * as fs from 'fs';
import * as path from 'path';

export async function handleGenerateDocsAction(options: { router: string, output: string }) {
  const startTime = Date.now();
  try {
    p.intro('Generate OpenAPI documentation');

    // Spinner for setup
    const setupSpinner = p.spinner();
    setupSpinner.start('Getting things ready to generate your documentation...');
    setupSpinner.message('We\'re just checking if your output folder exists and if your options look good.');
    // Brief delay to show the spinner in a friendly way
    await new Promise((resolve) => setTimeout(resolve, 600));
    setupSpinner.stop('Setup is all done, we\'re good to go!');

    // Helpers to get nice relative paths for display
    const makeRelative = (pth: string) => path.relative(process.cwd(), pth) || '.';
    const inputDirDisplay = makeRelative(options.router);
    const outputDirFull = path.resolve(options.output, 'docs');
    const outputDirDisplay = makeRelative(outputDirFull);

    // Loading router spinner
    const routerLoaderSpinner = p.spinner();
    routerLoaderSpinner.start('Loading your API router...');
    routerLoaderSpinner.message(`Looking for your router at: ${inputDirDisplay}`);
    const routerInstrospector = RouterInstrospector.create();
    const router = await routerInstrospector.loadRouter(options.router);
    if (!router) {
      routerLoaderSpinner.stop(`Oops! We couldn\'t find the router at: ${inputDirDisplay}`);
      process.exit(1);
      return;
    }
    routerLoaderSpinner.stop(`Router loaded successfully from: ${inputDirDisplay}`);

    // Docs config check spinner
    const docsConfigSpinner = p.spinner();
    docsConfigSpinner.start('Checking if your router has docs configuration...');
    if (!router.config.docs) {
      docsConfigSpinner.stop('Looks like there is no docs config set up in your router.');
      process.exit(1);
      return;
    }
    docsConfigSpinner.stop('Found docs config! You\'re all set.');

    // OpenAPI generation spinner
    const openapiGeneratorSpinner = p.spinner();
    openapiGeneratorSpinner.start('Building your OpenAPI documentation...');
    openapiGeneratorSpinner.message('Warming up the OpenAPI generator...');
    const openapiGenerator = OpenAPIGenerator.create(router.config.docs);
    openapiGeneratorSpinner.message('Putting together the OpenAPI JSON spec...');
    const openapi = openapiGenerator.generate(router);
    openapiGeneratorSpinner.stop('OpenAPI docs have been created for your API!');

    // Write to file spinner
    const writeFileSpinner = p.spinner();
    writeFileSpinner.start('Saving your OpenAPI docs to a file...');
    let outputDirCreated = false;
    if (!fs.existsSync(outputDirFull)) {
      fs.mkdirSync(outputDirFull, { recursive: true });
      outputDirCreated = true;
      writeFileSpinner.message(`We made a new output directory for you at: ${outputDirDisplay}`);
    } else {
      writeFileSpinner.message(`We\'ll use your existing output directory: ${outputDirDisplay}`);
    }

    const outputPath = path.join(outputDirFull, 'openapi.json');
    const outputPathDisplay = path.join(outputDirDisplay, 'openapi.json');
    fs.writeFileSync(outputPath, JSON.stringify(openapi, null, 2), 'utf8');
    const specSize = (fs.statSync(outputPath).size / 1024).toFixed(1);
    writeFileSpinner.stop(`Your OpenAPI docs are saved! Check ${outputPathDisplay} (${specSize} KB)`);

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

    p.log.success(
      `All done! Your OpenAPI documentation has been generated successfully in ${totalTime} seconds.`,
    );
    p.log.info(
      'Test your API on Igniter Studio at:  http://localhost:3000/api/v1/docs'
    );
    process.exit(0);
  } catch (error) {
    p.log.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
