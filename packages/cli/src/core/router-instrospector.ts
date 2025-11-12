import * as path from 'path';
import { build, type BuildFailure } from 'esbuild';
import { IgniterRouter, IgniterControllerConfig, IgniterAction } from '@igniter-js/core';
import zodToJsonSchema from 'zod-to-json-schema';
import { createRequire } from 'module';

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
  isStream?: boolean;
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
 * RouterIntrospector is responsible for:
 * 1. Loading a user's Igniter router dynamically (optionally compiling with esbuild).
 * 2. Traversing and introspecting the loaded router to construct a serializable schema with JSON schemas.
 */
export class RouterInstrospector {
  private constructor() {}

  static create(): RouterInstrospector {
    return new RouterInstrospector();
  }

  /**
   * Loads the user's router file by compiling it in memory with esbuild.
   * @param routerPath The path to the router file.
   * @returns Promise resolving to the loaded and evaluated IgniterRouter instance.
   * @throws RouterLoadError if loading or compiling fails.
   */
  public async loadRouter(routerPath: string): Promise<IgniterRouter<any, any, any, any, any>> {
    const fullPath = path.resolve(process.cwd(), routerPath);

    try {
      const result = await build({
        entryPoints: [fullPath],
        bundle: true,
        platform: 'node',
        format: 'cjs',
        write: false, // Keep the result in memory
        logLevel: 'silent', // We will handle our own logging
        external: [
          '@igniter-js/*',
          '@prisma/*',
          'prisma',
          'redis',
          'ioredis',
          'bullmq',
          '@opentelemetry/*',
          'chalk',
          'supports-color'
        ],
      });

      const [outputFile] = result.outputFiles;
      if (!outputFile) {
        throw new Error('esbuild did not produce any output.');
      }

      const compiledCode = outputFile.text;
      const routerModule = { exports: {} };

      const projectRequire = createRequire(fullPath);
      const requireFunc = (moduleName: string) => {
        try {
          return projectRequire(moduleName);
        } catch (error) {
          return require(moduleName);
        }
      };

      const factory = new Function('exports', 'require', 'module', '__filename', '__dirname', compiledCode);
      factory(routerModule.exports, requireFunc, routerModule, fullPath, path.dirname(fullPath));

      const moduleExports = routerModule.exports as any;
      const router = moduleExports.AppRouter || moduleExports.default || moduleExports;

      if (router && typeof router.controllers === 'object') {
        return router;
      }

      throw new Error('Module was compiled and loaded, but no valid Igniter router export was found.');
    } catch (error: any) {
      if (error && Array.isArray((error as BuildFailure).errors)) {
        const buildFailure = error as BuildFailure;
        const errorMessages = buildFailure.errors.map(e => e.text).join('\n');
        const detailedMessage = `esbuild failed to compile the router file:\n${errorMessages}`;
        throw new RouterLoadError(detailedMessage, error);
      }
      throw new RouterLoadError(`Failed to load router from ${routerPath}`, error);
    }
  }

  /**
   * Traverses a loaded router object and converts it into a serializable schema.
   * Converts Zod schemas to JSON schemas.
   * @param router The loaded IgniterRouter instance.
   * @returns An object containing the introspected schema and statistics.
   */
  public introspectRouter(router: IgniterRouter<any, any, any, any, any>): { schema: IntrospectedRouter, stats: { controllers: number, actions: number } } {
    const introspectedControllers: Record<string, IntrospectedController> = {};
    let totalActions = 0;

    for (const [controllerName, controller] of Object.entries(router.controllers)) {
      const introspectedActions: Record<string, IntrospectedAction> = {};
      const typedController = controller as IgniterControllerConfig<any>;

      if (typedController && typedController.actions) {
        for (const [actionName, action] of Object.entries(typedController.actions)) {
          const typedAction = action as IgniterAction<any, any, any, any, any, any, any, any, any, any>;

          introspectedActions[actionName] = {
            name: actionName,
            path: typedAction.path,
            method: typedAction.method,
            description: typedAction.description,
            bodySchema: typedAction.body ? zodToJsonSchema(typedAction.body, { target: 'openApi3' }) : undefined,
            querySchema: typedAction.query ? zodToJsonSchema(typedAction.query, { target: 'openApi3' }) : undefined,
          };
          totalActions++;
        }
      }

      introspectedControllers[controllerName] = {
        ...typedController,
        actions: introspectedActions,
      };
    }

    const schemaResult: IntrospectedRouter = {
      controllers: introspectedControllers,
      docs: router.config.docs,
    };

    return {
      schema: schemaResult,
      stats: {
        controllers: Object.keys(introspectedControllers).length,
        actions: totalActions
      }
    };
  }
}
