import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { createChildLogger } from '../logger';
import { createDetachedSpinner } from '../../lib/spinner';
import zodToJsonSchema from 'zod-to-json-schema';
import { IgniterRouter } from '@igniter-js/core';

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
export function introspectRouter(router: IgniterRouter<any, any, any, any, any>): { schema: IntrospectedRouter, stats: { controllers: number, actions: number } } {
  const logger = createChildLogger({ component: 'router-introspector' });
  logger.debug('Starting router introspection');

  const introspectedControllers: Record<string, any> = {};
  let totalActions = 0;

  for (const [controllerName, controller] of Object.entries(router.controllers)) {
    logger.debug(`Introspecting controller: ${controllerName}`);
    const introspectedActions: Record<string, any> = {};

    if (controller && (controller as any).actions) {
      for (const [actionName, action] of Object.entries((controller as any).actions)) {
        logger.debug(`Introspecting action: ${controllerName}.${actionName}`, { path: (action as any)?.path, method: (action as any)?.method });

        // Assumimos que bodySchema/querySchema já vieram convertidos pelo loader TSX (quando aplicável)
        const bodySchemaOutput = (action as any).bodySchema !== undefined ? (action as any).bodySchema : undefined;
        const querySchemaOutput = (action as any).querySchema !== undefined ? (action as any).querySchema : undefined;

        introspectedActions[actionName] = {
          name: (action as any)?.name || actionName,
          description: (action as any)?.description || '',
          path: (action as any)?.path || '',
          method: (action as any)?.method || 'GET',
          isStream: (action as any)?.stream || false,
          ...(bodySchemaOutput !== undefined ? { bodySchema: bodySchemaOutput } : {}),
          ...(querySchemaOutput !== undefined ? { querySchema: querySchemaOutput } : {}),
        };
        totalActions++;
      }
    } else {
      logger.debug(`Controller ${controllerName} has no actions property or is invalid.`);
    }

    introspectedControllers[controllerName] = {
      name: (controller as any)?.name || controllerName,
      description: (controller as any)?.description || '',
      path: (controller as any)?.path || '',
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
 * Load router from file with simplified approach
 */
export async function loadRouter(routerPath: string): Promise<IgniterRouter<any, any, any, any, any> | null> {
  const logger = createChildLogger({ component: 'router-loader' });
  const fullPath = path.resolve(process.cwd(), routerPath);

  logger.debug('Loading router', { path: routerPath });

  try {
    const module = await loadWithTypeScriptSupport(fullPath);

    if (module) {
      if (module?.config && module?.controllers) {
        return module;
      }

      const router = module?.AppRouter || module?.default?.AppRouter || module?.default || module?.router;

      if (router && typeof router === 'object') {
        return router;
      } else {
        logger.debug('Module loaded but no router found', {
          exports: Object.keys(module || {}),
        });
      }
    }

    const fallbackSpinner = createDetachedSpinner('Trying fallback loading method...');
    fallbackSpinner.start();

    const fallbackModule = await loadRouterWithIndexResolution(fullPath);

    if (fallbackModule) {
      if (fallbackModule?.config && fallbackModule?.controllers) {
        fallbackSpinner.success(`Router loaded successfully - ${Object.keys(fallbackModule.controllers).length} controllers`);
        return fallbackModule;
      }

      const router = fallbackModule?.AppRouter || fallbackModule?.default?.AppRouter || fallbackModule?.default || fallbackModule?.router;

      if (router && typeof router === 'object') {
        fallbackSpinner.success(`Router loaded successfully - ${Object.keys(router.controllers).length} controllers`);
        return router;
      }
    }

    fallbackSpinner.error('Could not load router');

  } catch (error) {
    logger.error('Failed to load router', { path: routerPath }, error);
  }

  return null;
}

/**
 * Load TypeScript files using TSX runtime loader
 */
async function loadWithTypeScriptSupport(filePath: string): Promise<any> {
  const logger = createChildLogger({ component: 'tsx-loader' });

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
          import { zodToJsonSchema } from 'zod-to-json-schema'; /* Precisamos importar isso no script filho */

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
                          /* MODIFICAÇÃO PRINCIPAL AQUI */
                          safeActions[actionName] = {
                            name: (action as any).name,
                            path: (action as any).path,
                            method: (action as any).method,
                            description: (action as any).description,
                            /* Convertemos o schema Zod para JSON Schema AQUI, antes do JSON.stringify */
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
