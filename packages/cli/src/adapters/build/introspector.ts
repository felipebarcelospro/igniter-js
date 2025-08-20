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
}
