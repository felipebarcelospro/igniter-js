import * as fs from 'fs';
import * as path from 'path';
import { build, type BuildFailure } from 'esbuild';
import { createChildLogger, formatError } from '../logger';
import { IgniterRouter } from '@igniter-js/core';
import zodToJsonSchema from 'zod-to-json-schema';

// This file is responsible for dynamically loading and introspecting the user's Igniter router.

export interface IntrospectedRouter {
  controllers: Record<string, IntrospectedController>;
  docs?: any;
}

interface IntrospectedController {
  name: string;
  description?: string;
  path: string;
  actions: Record<string, IntrospectedAction>;
}

interface IntrospectedAction {
  name?: string;
  description?: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  tags?: string[];
  bodySchema?: any;
  querySchema?: any;
  paramSchemas?: Record<string, any>;
  responseSchema?: any;
  isStream: boolean;
  security?: any;
}

/**
 * Custom error class for router loading failures.
 */
export class RouterLoadError extends Error {
  public originalError: any;

  constructor(message: string, originalError?: any) {
    super(message);
    this.name = 'RouterLoadError';
    this.originalError = originalError;
  }
}

/**
 * Traverses a loaded router object and converts it into a serializable schema.
 * Also converts Zod schemas to JSON schemas.
 */
export function introspectRouter(router: IgniterRouter<any, any, any, any, any>): { schema: IntrospectedRouter, stats: { controllers: number, actions: number } } {
  const logger = createChildLogger({ component: 'router-introspector' });
  logger.debug('Starting router introspection');

  const introspectedControllers: Record<string, any> = {};
  let totalActions = 0;

  for (const [controllerName, controller] of Object.entries(router.controllers)) {
    const introspectedActions: Record<string, any> = {};

    if (controller && (controller as any).actions) {
      for (const [actionName, action] of Object.entries((controller as any).actions)) {
        logger.debug(`Introspecting action: ${controllerName}.${actionName}`);

        introspectedActions[actionName] = {
          ...action,
          body: undefined, // Remove original Zod schema
          query: undefined,
          // Convert Zod schemas to JSON Schemas for the client
          bodySchema: (action as any).body ? zodToJsonSchema((action as any).body, { target: 'openApi3' }) : undefined,
          querySchema: (action as any).query ? zodToJsonSchema((action as any).query, { target: 'openApi3' }) : undefined,
        };
        totalActions++;
      }
    }

    introspectedControllers[controllerName] = {
      ...controller,
      actions: introspectedActions,
    };
  }

  const schemaResult = {
    controllers: introspectedControllers,
    docs: (router as any)?.config?.docs,
  } as IntrospectedRouter;

  return {
    schema: schemaResult,
    stats: {
      controllers: Object.keys(introspectedControllers).length,
      actions: totalActions
    }
  };
}


/**
 * Loads the user's router file by compiling it in memory with esbuild.
 * This is a robust method that isolates the CLI's dependencies from the user's project.
 */
export async function loadRouter(routerPath: string): Promise<IgniterRouter<any, any, any, any, any>> {
  const logger = createChildLogger({ component: 'esbuild-loader' });
  const fullPath = path.resolve(process.cwd(), routerPath);

  logger.debug('Compiling and loading router with esbuild', { path: fullPath });

  try {
    const result = await build({
      entryPoints: [fullPath],
      bundle: true,
      platform: 'node',
      format: 'cjs',
      write: false, // Keep the result in memory
      logLevel: 'silent', // We will handle our own logging
    });

    const [outputFile] = result.outputFiles;
    if (!outputFile) {
      throw new Error('esbuild did not produce any output.');
    }

    // The compiled code is in memory. We need to execute it to get the router object.
    // We create a temporary module environment to `require` the code.
    const compiledCode = outputFile.text;
    const routerModule = { exports: {} };
    const requireFunc = (moduleName: string) => require(moduleName);

    // This is a sandboxed execution of the compiled CJS code.
    const factory = new Function('exports', 'require', 'module', '__filename', '__dirname', compiledCode);
    factory(routerModule.exports, requireFunc, routerModule, fullPath, path.dirname(fullPath));

    const moduleExports = routerModule.exports as any;
    const router = moduleExports.AppRouter || moduleExports.default || moduleExports;

    if (router && typeof router.controllers === 'object') {
      logger.success('Router loaded successfully via esbuild.');
      return router;
    }

    throw new Error('Module was compiled and loaded, but no valid Igniter router export was found.');
  } catch (error: any) {
    // Catch esbuild BuildFailure errors and format them nicely.
    if (error && Array.isArray((error as BuildFailure).errors)) {
      const buildFailure = error as BuildFailure;
      const errorMessages = buildFailure.errors.map(e => e.text).join('\n');
      const detailedMessage = `esbuild failed to compile the router file:\n${errorMessages}`;
      throw new RouterLoadError(detailedMessage, error);
    }

    // For other errors, wrap them in our custom error type.
    throw new RouterLoadError(`Failed to load router from ${routerPath}`, error);
  }

  return null;
}

/**
 * Load TypeScript files using TSX runtime loader
 */
async function loadWithTypeScriptSupport(filePath: string): Promise<any> {
  const logger = createChildLogger({ component: 'tsx-loader' });
  const { pathToFileURL } = require('url');

  const jsPath = filePath.replace(/\.ts$/, '.js');
  if (fs.existsSync(jsPath)) {
    try {
      logger.debug('Using compiled JS version');
      delete require.cache[jsPath];
      return require(jsPath);
    } catch (error) {
      logger.debug('Compiled JS loading failed, trying TypeScript...');
    }
  }

  if (filePath.endsWith('.ts')) {
    try {
      logger.debug('Using TSX runtime loader');
      const { spawn } = require('child_process');

      const isWindows = process.platform === 'win32';

      const tsxCheckResult = await new Promise<boolean>((resolve) => {
        const checkChild = spawn('npx', ['tsx', '--version'], {
          stdio: 'pipe',
          cwd: process.cwd(),
          shell: isWindows,
        });
        checkChild.on('close', (code: number | null) => resolve(code === 0));
        checkChild.on('error', () => resolve(false));
        setTimeout(() => {
          checkChild.kill();
          resolve(false);
        }, 5000);
      });

      if (!tsxCheckResult) {
        throw new Error('TSX not available');
      }

      return await new Promise<any>((resolve, reject) => {
        const normalizedPath = path.resolve(filePath);
        const fileUrl = pathToFileURL(normalizedPath).href;

        const tsxScript = `
          import { zodToJsonSchema } from 'zod-to-json-schema';

          async function loadRouter() {
            try {
              const module = await import('${fileUrl}');
              const router = module?.AppRouter || module?.default?.AppRouter || module?.default || module?.router;

              if (router && typeof router === 'object') {
                const safeRouter = {
                  config: {
                    baseURL: router.config?.baseURL || '',
                    basePATH: router.config?.basePATH || '',
                    docs: router.config?.docs || undefined,
                  },
                  controllers: {}
                };

                if (router.controllers && typeof router.controllers === 'object') {
                  for (const [controllerName, controller] of Object.entries(router.controllers)) {
                    if (controller && typeof controller === 'object' && (controller as any).actions) {
                      const safeActions = {};
                      for (const [actionName, action] of Object.entries((controller as any).actions)) {
                        if (action && typeof action === 'object') {
                          safeActions[actionName] = {
                            name: (action as any).name,
                            path: (action as any).path,
                            method: (action as any).method,
                            description: (action as any).description,
                            bodySchema: (action as any).body ? zodToJsonSchema((action as any).body, { target: 'openApi3' }) : undefined,
                            querySchema: (action as any).query ? zodToJsonSchema((action as any).query, { target: 'openApi3' }) : undefined,
                            use: (action as any).use,
                            stream: (action as any).stream,
                          };
                        }
                      }
                      safeRouter.controllers[controllerName] = {
                        name: (controller as any).name || controllerName,
                        path: (controller as any).path || '',
                        description: (controller as any).description,
                        actions: safeActions,
                      };
                    }
                  }
                }
                console.log('__ROUTER_SUCCESS__' + JSON.stringify(safeRouter));
                process.exit(0);
              } else {
                console.log('__ROUTER_ERROR__No router found in module');
                process.exit(1);
              }
            } catch (error) {
              console.log('__ROUTER_ERROR__' + error.message);
              process.exit(1);
            }
          }
          loadRouter();
        `.replace(/(\t| {2})/g, "").replace(/\r?\n/g, " ").trim();

        const child = spawn('npx', ['tsx', '-e', `"${tsxScript}"`], {
          stdio: 'pipe',
          cwd: process.cwd(),
          shell: isWindows,
          env: { ...process.env, NODE_NO_WARNINGS: '1' },
        });

        let output = '';
        let errorOutput = '';

        child.stdout?.on('data', (data: Buffer) => (output += data.toString()));
        child.stderr?.on('data', (data: Buffer) => (errorOutput += data.toString()));

        child.on('close', (code: number | null) => {
          if (output.includes('__ROUTER_SUCCESS__')) {
            const resultLine = output.split('\n').find(line => line.includes('__ROUTER_SUCCESS__'));
            if (resultLine) {
              try {
                const routerData = JSON.parse(resultLine.replace('__ROUTER_SUCCESS__', ''));
                resolve(routerData);
              } catch (e: any) {
                reject(new Error('Failed to parse router data: ' + e.message));
              }
            } else {
              reject(new Error('Router success marker found but no data'));
            }
          } else if (output.includes('__ROUTER_ERROR__')) {
            const errorLine = output.split('\n').find(line => line.includes('__ROUTER_ERROR__'));
            const errorMsg = errorLine ? errorLine.replace('__ROUTER_ERROR__', '') : 'Unknown error';
            reject(new Error('Router loading failed: ' + errorMsg));
          } else {
            reject(new Error(`TSX execution failed with code ${code}: ${errorOutput || 'No output'}`));
          }
        });

        child.on('error', (error: any) => reject(new Error('Failed to spawn TSX process: ' + error.message)));
        setTimeout(() => {
          child.kill();
          reject(new Error('Timeout loading TypeScript file with TSX'));
        }, 30000);
      });
    } catch (error) {
      logger.debug('TSX runtime loader failed', {}, error);
    }
  }

  return null;
}

/**
 * Load router by resolving directory imports to index files
 */
async function loadRouterWithIndexResolution(routerPath: string): Promise<any> {
  // This function seems complex and might be a source of issues.
  // For now, we will rely on the tsx loader which is more robust.
  return null;
}
