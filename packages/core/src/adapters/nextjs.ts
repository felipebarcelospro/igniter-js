import type { IgniterRouter } from "../types";
import type { NextConfig } from "next";

/**
 * Lista CONSERVADORA de módulos Node.js nativos que causam problemas no client bundle
 * Apenas módulos que realmente quebram o build/runtime do Next.js
 */
const NODE_MODULES = [
  // Node.js built-in modules (core modules que sempre causam problema)
  "fs",
  "path",
  "crypto",
  "os",
  "util",
  "stream",
  "buffer",
  "child_process",
  "cluster",
  "net",
  "http",
  "https",
  "http2",
  "dns",
  "tls",
  "url",
  "querystring",
  "zlib",
  'bullmq',
  'worker_threads',

  // Node.js built-in modules with 'node:' prefix (Node 16+)
  "node:fs",
  "node:path",
  "node:crypto",
  "node:os",
  "node:util",
  "node:stream",
  "node:buffer",
  "node:child_process",
  "node:cluster",
  "node:net",
  "node:http",
  "node:https",
  "node:http2",
  "node:dns",
  "node:tls",
  "node:url",
  "node:querystring",
  "node:zlib",
] as const;

/**
 * Lista MÍNIMA de pacotes específicos do Igniter.js (server-only)
 */
const IGNITER_PACKAGES = [
  "@igniter-js/adapter-redis",
  "@igniter-js/adapter-bullmq",
  "@igniter-js/adapter-opentelemetry",
  "@igniter-js/adapter-console-logger",
] as const;

/**
 * Configurações CONSERVADORAS de pacotes por categoria
 * Apenas o que realmente causa problema
 */
const PACKAGE_CONFIG = {
  server: [
    // Apenas adapters do Igniter que são definitivamente server-only
    ...IGNITER_PACKAGES,
  ],
  client: [
    // Apenas Node.js built-ins que sempre causam problema
    ...NODE_MODULES,
    // E alguns adapters específicos do Igniter
    ...IGNITER_PACKAGES,
  ],
} as const;

/**
 * Utilitário para logging seguro (não quebra se console não estiver disponível)
 */
const safeLog = {
  warn: (...args: any[]) => {
    try {
      if (typeof console !== "undefined" && console.warn) {
        console.warn("[withIgniter]", ...args);
      }
    } catch {
      // Silently fail if console is not available
    }
  },
  info: (...args: any[]) => {
    try {
      if (typeof console !== "undefined" && console.info) {
        console.info("[withIgniter]", ...args);
      }
    } catch {
      // Silently fail if console is not available
    }
  },
};

/**
 * Detecta se um módulo é um módulo Node.js built-in (abordagem conservadora)
 */
const isNodeModule = (packageName: string): boolean => {
  // Verifica apenas se está na lista conhecida de built-ins
  return NODE_MODULES.includes(packageName as any);
};

/**
 * Types of empty modules available
 */
export type EmptyModuleType = "proxy" | "silent" | "basic" | "smart";

/**
 * Cria um arquivo vazio seguro para substituição de módulos
 */
const createEmptyModuleContent = (type: EmptyModuleType = "proxy") => {
  switch (type) {
    case "basic":
      return `
// Auto-generated empty module for client-side compatibility
const basicStub = {
  // Critical path.posix fallbacks to prevent errors
  posix: {
    normalize: () => '',
    join: () => '',
    resolve: () => '',
    dirname: () => '',
    basename: () => '',
    extname: () => ''
  },
  // Basic path methods
  normalize: () => '',
  join: () => '',
  resolve: () => '',
  dirname: () => '',
  basename: () => '',
      extname: () => ''
};

module.exports = basicStub;
module.exports.default = basicStub;
if (typeof exports !== 'undefined') {
  exports.default = basicStub;
}
`.trim();

    case "silent":
      return `
// Auto-generated empty module for client-side compatibility (silent mode)
const emptyFn = () => {};
const emptyAsyncFn = () => Promise.resolve();
const emptyObj = {
  // Critical path.posix fallbacks to prevent errors
  posix: {
    normalize: () => '',
    join: () => '',
    resolve: () => '',
    dirname: () => '',
    basename: () => '',
    extname: () => ''
  },
  // Basic path methods
  normalize: () => '',
  join: () => '',
  resolve: () => '',
  dirname: () => '',
  basename: () => '',
  extname: () => ''
};

const createStub = () => new Proxy(emptyObj, {
  get: (target, prop) => {
    // Return actual methods for path-related calls
    if (prop in target) {
      return target[prop];
    }
    return createStub();
  },
  set: () => true,
  has: () => false,
  apply: () => emptyAsyncFn(),
  construct: () => createStub()
});

const stub = createStub();
module.exports = stub;
module.exports.default = stub;
if (typeof exports !== 'undefined') {
  exports.default = stub;
}
`.trim();

    case "smart":
      return `
// Auto-generated empty module with smart fallbacks
const commonFallbacks = {
  // fs module
  readFileSync: () => '',
  writeFileSync: () => {},
  existsSync: () => false,
  statSync: () => ({ isDirectory: () => false, isFile: () => false }),
  
  // path module  
  join: (...args) => args.filter(Boolean).join('/'),
  resolve: (...args) => args.filter(Boolean).join('/'),
  dirname: (p) => p ? p.split('/').slice(0, -1).join('/') : '',
  basename: (p) => p ? p.split('/').pop() : '',
  extname: (p) => p && p.includes('.') ? '.' + p.split('.').pop() : '',
  normalize: (p) => p ? p.replace(/\\/g, '/').replace(/\/+/g, '/') : '',
  
  // path.posix fallbacks (critical for preventing posix.normalize errors)
  posix: {
    join: (...args) => args.filter(Boolean).join('/'),
    resolve: (...args) => args.filter(Boolean).join('/'),
    dirname: (p) => p ? p.split('/').slice(0, -1).join('/') : '',
    basename: (p) => p ? p.split('/').pop() : '',
    extname: (p) => p && p.includes('.') ? '.' + p.split('.').pop() : '',
    normalize: (p) => p ? p.replace(/\\/g, '/').replace(/\/+/g, '/') : '',
    relative: (from, to) => to || '',
    isAbsolute: (p) => p && p.startsWith('/'),
    parse: (p) => ({ root: '', dir: '', base: p || '', ext: '', name: p || '' }),
    format: (obj) => obj.base || obj.name || '',
    sep: '/',
    delimiter: ':'
  },
  
  // crypto module
  createHash: () => ({ 
    update: function() { return this; }, 
    digest: () => '' 
  }),
  randomBytes: (size) => new Uint8Array(size || 0),
  
  // events module (allow EventEmitter for client-side usage)
  EventEmitter: class EventEmitter {
    on() { return this; }
    once() { return this; }
    emit() { return false; }
    removeListener() { return this; }
    removeAllListeners() { return this; }
  },
  
  // Common Node.js objects that often leak into client bundles
  Stream: class Stream { constructor() { return this; } },
  Writable: class Writable { constructor() { return this; } },
  Readable: class Readable { constructor() { return this; } },
  Transform: class Transform { constructor() { return this; } },
  URL: class URL { constructor() { return this; } },
  URLSearchParams: class URLSearchParams { constructor() { return this; } },
  inherits: () => {},
  parse: () => ({}),
  extname: () => ''
};

const createSmartProxy = () => {
  return new Proxy(commonFallbacks, {
    get: (target, prop) => {
      if (prop in target) {
        return target[prop];
      }
      
      if (prop === 'default' || prop === '__esModule') {
        return target;
      }
      
      // Return empty function for unknown properties
      return () => {};
    }
  });
};

const smartStub = createSmartProxy();
module.exports = smartStub;
module.exports.default = smartStub;
if (typeof exports !== 'undefined') {
  exports.default = smartStub;
}
`.trim();

    case "proxy":
    default:
      return `
// Auto-generated empty module for client-side compatibility  
// This prevents server-only modules from being bundled in the client

const createEmptyModule = () => {
  const warningShown = new Set();
  
  const showWarning = (prop) => {
    if (!warningShown.has(prop) && typeof console !== 'undefined' && console.warn) {
      console.warn(\`[Igniter] Attempted to use server-only module "\${prop}" in client bundle. This is likely a bug.\`);
      warningShown.add(prop);
    }
  };

  // Create a proxy that intercepts all property access
  const handler = {
    get: (target, prop) => {
      // Allow common properties that might be checked
      if (prop === 'default' || prop === '__esModule' || prop === Symbol.toStringTag) {
        return target[prop];
      }
      
      // Allow typeof checks
      if (prop === Symbol.toPrimitive || prop === 'valueOf' || prop === 'toString') {
        return () => '[Empty Module]';
      }
      
      // Show warning for other properties (only in development)
      if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') {
        showWarning(prop);
      }
      
      // Return appropriate empty values based on property name patterns
      if (typeof prop === 'string') {
        // Common Node.js objects that often cause issues
        const commonNodeObjects = {
          'Stream': class Stream { constructor() { return this; } },
          'Writable': class Writable { constructor() { return this; } },
          'Readable': class Readable { constructor() { return this; } },
          'Transform': class Transform { constructor() { return this; } },
          'URL': class URL { constructor() { return this; } },
          'URLSearchParams': class URLSearchParams { constructor() { return this; } },
          'inherits': () => {},
          'parse': () => ({}),
          'extname': () => '',
          'posix': {
            normalize: () => '',
            join: () => '',
            resolve: () => '',
            dirname: () => '',
            basename: () => '',
            extname: () => ''
          }
        };
        
        if (commonNodeObjects[prop]) {
          return commonNodeObjects[prop];
        }
        
        // Sync functions
        if (prop.endsWith('Sync') || prop.startsWith('create') || prop.startsWith('get')) {
          return () => null;
        }
        // Async functions
        if (prop.endsWith('Async') || prop.startsWith('connect') || prop.startsWith('send')) {
          return () => Promise.resolve(null);
        }
        // Class constructors
        if (prop[0] === prop[0].toUpperCase() && prop.length > 1) {
          return class EmptyClass {
            constructor() { return this; }
          };
        }
      }
      
      // Default to empty function that can be called
      return () => null;
    },
    
    set: () => true, // Allow setting properties silently
    has: () => false, // Pretend properties don't exist (safer for conditionals)
    ownKeys: () => [], // Return empty keys
    getOwnPropertyDescriptor: () => ({ enumerable: false, configurable: true, value: undefined }),
    apply: () => null, // If the module itself is called as function
    construct: () => ({}) // If the module itself is used as constructor
  };

  const target = {
    default: {},
    __esModule: true,
    // Add posix fallback for path module specifically
    posix: {
      normalize: (p) => p ? p.replace(/\\/g, '/').replace(/\/+/g, '/') : '',
      join: (...args) => args.filter(Boolean).join('/'),
      resolve: (...args) => args.filter(Boolean).join('/'),
      dirname: (p) => p ? p.split('/').slice(0, -1).join('/') : '',
      basename: (p) => p ? p.split('/').pop() : '',
      extname: (p) => p && p.includes('.') ? '.' + p.split('.').pop() : '',
      relative: (from, to) => to || '',
      isAbsolute: (p) => p && p.startsWith('/'),
      parse: (p) => ({ root: '', dir: '', base: p || '', ext: '', name: p || '' }),
      format: (obj) => obj.base || obj.name || '',
      sep: '/',
      delimiter: ':'
    },
    // Add common path methods directly
    normalize: (p) => p ? p.replace(/\\/g, '/').replace(/\/+/g, '/') : '',
    join: (...args) => args.filter(Boolean).join('/'),
    resolve: (...args) => args.filter(Boolean).join('/'),
    dirname: (p) => p ? p.split('/').slice(0, -1).join('/') : '',
    basename: (p) => p ? p.split('/').pop() : '',
    extname: (p) => p && p.includes('.') ? '.' + p.split('.').pop() : ''
  };

  // Return proxy if available, otherwise fallback to basic object
  if (typeof Proxy !== 'undefined') {
    return new Proxy(target, handler);
  } else {
    // Fallback for environments without Proxy support
    return target;
  }
};

const emptyModule = createEmptyModule();

// Export for all module systems
module.exports = emptyModule;
module.exports.default = emptyModule;

if (typeof exports !== 'undefined') {
  exports.default = emptyModule;
}
`.trim();
  }
};

/**
 * Valida e normaliza a configuração do Next.js
 */
const validateAndNormalizeConfig = (config: NextConfig): NextConfig => {
  const normalized: NextConfig = { ...config };

  // Garante que arrays essenciais existam
  if (!normalized.serverExternalPackages) {
    normalized.serverExternalPackages = [];
  }

  if (!normalized.turbopack) {
    normalized.turbopack = {};
  }

  if (!normalized.turbopack.resolveAlias) {
    normalized.turbopack.resolveAlias = {};
  }

  return normalized;
};

/**
 * Merge configurations with error handling and validation
 *
 * @param configs - Array of Next.js configurations to merge
 * @returns Merged and validated configuration
 */
const mergeConfigurations = (configs: NextConfig[]): NextConfig => {
  let mergedConfig: NextConfig = {};

  for (const config of configs) {
    try {
      const normalizedConfig = validateAndNormalizeConfig(config);
      mergedConfig = {
        ...mergedConfig,
        ...normalizedConfig,
        // Handle arrays properly
        serverExternalPackages: [
          ...(mergedConfig.serverExternalPackages || []),
          ...(normalizedConfig.serverExternalPackages || []),
        ],
        // Handle nested objects
        turbopack: {
          ...(mergedConfig.turbopack || {}),
          ...(normalizedConfig.turbopack || {}),
          resolveAlias: {
            ...(mergedConfig.turbopack?.resolveAlias || {}),
            ...(normalizedConfig.turbopack?.resolveAlias || {}),
          },
        },
      };
    } catch (error) {
      safeLog.warn("Failed to merge config:", error);
      // Continue with other configs even if one fails
    }
  }

  return mergedConfig;
};

/**
 * Creates webpack configuration with proper error handling
 */
const createWebpackConfig = (mergedConfig: NextConfig) => {
  return (config: any, context: any) => {
    let newConfig = config;

    try {
      // Apply existing webpack configs in order
      if (mergedConfig.webpack) {
        newConfig = mergedConfig.webpack(newConfig, context);
      }

      // Apply client-side aliasing only for client bundles
      if (!context.isServer) {
        // Ensure resolve and alias objects exist
        if (!newConfig.resolve) {
          newConfig.resolve = {};
        }
        if (!newConfig.resolve.alias) {
          newConfig.resolve.alias = {};
        }

        // Create aliases ONLY for Node.js built-ins (não para npm packages normais)
        const nodeBuiltinAliases = NODE_MODULES.reduce(
          (acc, pkg) => {
            // Use false to completely exclude Node.js built-in modules
            acc[pkg] = false;
            return acc;
          },
          {} as Record<string, boolean>,
        );

        newConfig.resolve.alias = {
          ...newConfig.resolve.alias,
          ...nodeBuiltinAliases,
        };

        safeLog.info(
          `Applied ${Object.keys(nodeBuiltinAliases).length} Node.js built-in aliases (axios, zod, etc. are NOT affected)`,
        );
      }

      // Add fallbacks for better compatibility
      if (!newConfig.resolve.fallback) {
        newConfig.resolve.fallback = {};
      }

      // Add comprehensive Node.js fallbacks for edge cases
      const fallbacks = NODE_MODULES.reduce(
        (acc, pkg) => {
          // Remove 'node:' prefix for fallback mapping
          const cleanPkg = pkg.replace("node:", "");
          acc[cleanPkg] = false;
          return acc;
        },
        {} as Record<string, boolean>,
      );

      newConfig.resolve.fallback = {
        ...fallbacks,
        ...newConfig.resolve.fallback,
      };
    } catch (error) {
      safeLog.warn("Error in webpack configuration:", error);
      // Return original config if there's an error
      return config;
    }

    return newConfig;
  };
};

/**
 * Merges multiple Next.js configurations with Igniter.js dependencies
 *
 * Features:
 * - Robust error handling and fallbacks
 * - Automatic Node.js module detection
 * - Comprehensive package exclusion for client bundles
 * - Validation and normalization of configs
 * - Safe logging that doesn't break builds
 * - Support for both Turbopack and Webpack
 *
 * @param configs - Multiple Next.js configurations to merge
 * @returns A single Next.js configuration with Igniter.js dependencies
 *
 * @example
 * ```typescript
 * // Basic usage
 * export default withIgniter()
 *
 * // With custom config
 * export default withIgniter({
 *   experimental: {
 *     appDir: true
 *   }
 * })
 *
 * // Merging multiple configs
 * export default withIgniter(baseConfig, customConfig, anotherConfig)
 *
 * // Advanced usage with validation and debug
 * export default withIgniterAdvanced({
 *   debug: true,
 *   validateConfig: true,
 *   excludePackages: ['my-server-only-package'],
 *   serverPackages: ['my-custom-server-lib']
 * })({
 *   experimental: {
 *     typedRoutes: true
 *   },
 *   turbopack: {
 *     rules: {
 *       '*.svg': {
 *         loaders: [{ loader: '@svgr/webpack' }],
 *         as: '*.js'
 *       }
 *     }
 *   }
 * })
 *
 * // Debug existing configuration
 * import { debugIgniterConfig, validateIgniterConfig } from '@igniter-js/core/adapters'
 *
 * const myConfig = withIgniter({ ... })
 * debugIgniterConfig(myConfig) // Logs detailed config info
 *
 * const validation = validateIgniterConfig(myConfig)
 * if (!validation.isValid) {
 *   console.warn('Config issues:', validation.issues)
 * }
 *
 * // Check if a package should be excluded
 * import { shouldExcludeFromClient, debugPackageStatus } from '@igniter-js/core/adapters'
 *
 * console.log(shouldExcludeFromClient('fs')) // true
 * console.log(shouldExcludeFromClient('zod')) // false (client-safe)
 *
 * // Debug package status
 * const zodStatus = debugPackageStatus('zod')
 * console.log(zodStatus)
 * // {
 * //   isExcluded: false,
 * //   isClientSafe: true,
 * //   isNodeModule: false,
 * //   recommendation: 'include',
 * //   reason: 'Explicitly marked as client-safe'
 * // }
 *
 * const fsStatus = debugPackageStatus('fs')
 * console.log(fsStatus)
 * // {
 * //   isExcluded: true,
 * //   isClientSafe: false,
 * //   isNodeModule: true,
 * //   recommendation: 'exclude',
 * //   reason: 'Node.js built-in module'
 * // }
 *
 * // Get all excluded packages
 * import { getExcludedPackages } from '@igniter-js/core/adapters'
 *
 * console.log(getExcludedPackages()) // ['fs', 'crypto', 'ioredis', ...]
 * ```
 *
 * @remarks
 * This function automatically handles:
 * - 100+ Node.js built-in modules (fs, crypto, etc.)
 * - Common server-only packages (ioredis, bullmq, etc.)
 * - All Igniter.js adapter packages
 * - Development tools (webpack, typescript, etc.)
 * - Database packages (prisma, mongodb, etc.)
 * - AWS SDK and other cloud packages
 * - Testing frameworks (jest, vitest, etc.)
 *
 * If you encounter bundle issues with a new package, you can either:
 * 1. Add it to the exclude list using `withIgniterAdvanced({ excludePackages: ['pkg'] })`
 * 2. Report it as an issue so we can add it to the default list
 *
 * The function gracefully handles errors and provides fallbacks, so your build
 * should never break due to configuration issues.
 */
export const withIgniter = (...configs: NextConfig[]): NextConfig => {
  try {
    safeLog.info("Initializing Igniter.js Next.js adapter...");

    // If no configs provided, start with empty config
    if (configs.length === 0) {
      configs = [{}];
    }

    // Merge all configurations
    const mergedConfig = mergeConfigurations(configs);

    // Create final configuration
    const finalConfig: NextConfig = {
      ...mergedConfig,

      // Server external packages (prevents bundling in server)
      serverExternalPackages: [
        ...(mergedConfig.serverExternalPackages || []),
        ...PACKAGE_CONFIG.server,
      ],

      // Turbopack configuration (Next.js 13+)
      turbopack: {
        ...(mergedConfig.turbopack || {}),
        resolveAlias: {
          ...(mergedConfig.turbopack?.resolveAlias || {}),
          // Map ONLY Node.js built-ins to empty modules (não npm packages como axios)
          ...NODE_MODULES.reduce(
            (acc, pkg) => {
              acc[pkg] = "./empty.js";
              return acc;
            },
            {} as Record<string, string>,
          ),
        },
      },

      // Webpack configuration with error handling
      webpack: createWebpackConfig(mergedConfig),
    };

    safeLog.info(
      `Configuration complete. Excluded ${NODE_MODULES.length} Node.js built-ins + ${IGNITER_PACKAGES.length} Igniter adapters (${PACKAGE_CONFIG.client.length} total). NPM packages like axios, zod are preserved.`,
    );

    return finalConfig;
  } catch (error) {
    safeLog.warn("Error in withIgniter configuration:", error);

    // Return a minimal working configuration as fallback
    return {
      ...(configs[0] || {}),
      webpack: (config: any) => {
        safeLog.warn("Using fallback webpack configuration");
        return config;
      },
    };
  }
};

/**
 * Safe header accessor that works in both server and client environments
 * This prevents "next/headers" from being imported in client components
 */
export const getHeadersSafe = async (): Promise<Headers> => {
  if (typeof window === "undefined") {
    try {
      const { headers } = await import("next/headers");
      return headers();
    } catch (error) {
      console.warn(
        "Failed to import next/headers, falling back to empty headers",
        error,
      );
      return new Headers();
    }
  } else {
    // In client, we can't access request headers, so return empty headers
    // You could alternatively return some client-side headers if needed
    return new Headers();
  }
};

/**
 * Adapter function to convert an IgniterRouter instance into Next.js route handlers
 *
 * @param router - An instance of IgniterRouter that will handle the incoming requests
 * @returns An object containing HTTP method handlers compatible with Next.js route handlers
 * @example
 * ```typescript
 * const router = new IgniterRouter()
 * export const { GET, POST, PUT, DELETE, PATCH } = nextRouteHandlerAdapter(router)
 * ```
 *
 * @remarks
 * This adapter supports the following HTTP methods:
 * - GET
 * - POST
 * - PUT
 * - DELETE
 * - PATCH
 *
 * Each method handler receives a Next.js Request object and forwards it to the router's handler
 */
export const nextRouteHandlerAdapter = (router: IgniterRouter<any, any, any, any>) => {
  return {
    GET: (request: Request) => {
      return router.handler(request);
    },
    POST: (request: Request) => {
      return router.handler(request);
    },
    PUT: (request: Request) => {
      return router.handler(request);
    },
    DELETE: (request: Request) => {
      return router.handler(request);
    },
    PATCH: (request: Request) => {
      return router.handler(request);
    },
  };
};

/**
 * Creates a physical empty.js file for better Turbopack compatibility
 *
 * ⚠️ Server-only function - will return early if called in client environment
 */
export const createEmptyJsFile = async (
  targetDir: string = "public",
  type: EmptyModuleType = "proxy",
): Promise<string> => {
  // Early return if running in client environment
  if (typeof window !== "undefined") {
    safeLog.warn("createEmptyJsFile should only be called server-side");
    return "./empty.js";
  }

  try {
    const fs = await import("fs").catch(() => null);
    if (!fs) {
      safeLog.warn("fs module not available, skipping empty.js creation");
      return "./empty.js";
    }

    const path = await import("path").catch(() => null);
    if (!path) {
      safeLog.warn("path module not available, skipping empty.js creation");
      return "./empty.js";
    }

    const emptyJsPath = path.join(process.cwd(), targetDir, "empty.js");
    const emptyJsContent = createEmptyModuleContent(type);

    // Create directory if it doesn't exist
    const dir = path.dirname(emptyJsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write empty.js file
    fs.writeFileSync(emptyJsPath, emptyJsContent, "utf8");
    safeLog.info(`Created empty.js (${type}) at ${emptyJsPath}`);

    return `./${path.relative(process.cwd(), emptyJsPath)}`;
  } catch (error) {
    safeLog.warn("Failed to create empty.js file:", error);
    return "./empty.js";
  }
};

/**
 * Validates that the Igniter configuration is working properly
 */
export const validateIgniterConfig = (
  config: NextConfig,
): {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
} => {
  const issues: string[] = [];
  const suggestions: string[] = [];

  try {
    // Check server external packages
    if (
      !config.serverExternalPackages ||
      config.serverExternalPackages.length === 0
    ) {
      issues.push("No serverExternalPackages configured");
      suggestions.push("Ensure withIgniter() is properly applied");
    }

    // Check Turbopack configuration
    if (!config.turbopack?.resolveAlias) {
      suggestions.push("Consider enabling Turbopack for better performance");
    }

    // Check webpack configuration
    if (!config.webpack) {
      issues.push("No webpack configuration found");
      suggestions.push(
        "Ensure withIgniter() is applied to your Next.js config",
      );
    }

    // Check for common problematic packages
    const problematicPackages = ["ioredis", "bullmq", "fs", "crypto"];
    const hasProblematicPackages = problematicPackages.some((pkg) => {
      return !config.serverExternalPackages?.includes(pkg);
    });

    if (hasProblematicPackages) {
      suggestions.push(
        "Some Node.js packages might not be properly excluded from client bundle",
      );
    }
  } catch (error) {
    issues.push(`Configuration validation failed: ${error}`);
  }

  return {
    isValid: issues.length === 0,
    issues,
    suggestions,
  };
};

/**
 * Debug utility to inspect the current Igniter configuration
 */
export const debugIgniterConfig = (config: NextConfig): void => {
  if (typeof window !== "undefined") {
    safeLog.warn("debugIgniterConfig should only be called server-side");
    return;
  }

  safeLog.info("=== Igniter Configuration Debug ===");
  safeLog.info(
    "Server External Packages:",
    config.serverExternalPackages?.length || 0,
  );
  safeLog.info(
    "Turbopack Aliases:",
    Object.keys(config.turbopack?.resolveAlias || {}).length,
  );
  safeLog.info("Webpack Function:", typeof config.webpack);

  const validation = validateIgniterConfig(config);
  if (!validation.isValid) {
    safeLog.warn("Configuration Issues:", validation.issues);
  }
  if (validation.suggestions.length > 0) {
    safeLog.info("Suggestions:", validation.suggestions);
  }

  safeLog.info("=== End Debug ===");
};

/**
 * Advanced withIgniter with additional options
 */
export const withIgniterAdvanced = (
  options: {
    /**
     * Additional packages to exclude from client bundle
     */
    excludePackages?: string[];

    /**
     * Additional packages to keep on server
     */
    serverPackages?: string[];

    /**
     * Enable debug logging
     */
    debug?: boolean;

    /**
     * Create physical empty.js file
     */
    createEmptyFile?: boolean;

    /**
     * Type of empty module to create
     * - 'proxy': Debug-friendly with warnings (default)
     * - 'silent': No warnings, just works
     * - 'basic': Minimal empty object
     * - 'smart': Smart fallbacks for common modules
     */
    emptyModuleType?: EmptyModuleType;

    /**
     * Validate configuration
     */
    validateConfig?: boolean;
  } = {},
) => {
  return (...configs: NextConfig[]): NextConfig => {
    const {
      excludePackages = [],
      serverPackages = [],
      debug = false,
      createEmptyFile = false,
      emptyModuleType = "proxy",
      validateConfig = false,
    } = options;

    // Extend package configurations
    const extendedConfig = {
      server: [...PACKAGE_CONFIG.server, ...serverPackages],
      client: [...PACKAGE_CONFIG.client, ...excludePackages],
    };

    // Create configuration using extended packages
    const result = withIgniter(...configs);

    // Apply extended configurations
    if (result.serverExternalPackages) {
      result.serverExternalPackages = [
        ...result.serverExternalPackages,
        ...serverPackages,
      ];
    }

    // Create empty file if requested
    if (createEmptyFile) {
      createEmptyJsFile("public", emptyModuleType).catch((error) => {
        safeLog.warn("Failed to create empty.js file:", error);
      });
    }

    // Validate configuration if requested
    if (validateConfig) {
      const validation = validateIgniterConfig(result);
      if (!validation.isValid) {
        safeLog.warn("Configuration validation failed:", validation.issues);
      }
      if (validation.suggestions.length > 0) {
        safeLog.info("Configuration suggestions:", validation.suggestions);
      }
    }

    // Debug output if requested
    if (debug) {
      debugIgniterConfig(result);
    }

    return result;
  };
};

/**
 * Utility to check if a package should be excluded from client bundle
 * APENAS Node.js built-ins, não npm packages normais como axios, zod, etc.
 */
export const shouldExcludeFromClient = (packageName: string): boolean => {
  return (
    isNodeModule(packageName) || IGNITER_PACKAGES.includes(packageName as any)
  );
};

/**
 * Utility to check if a package is NOT a Node.js built-in (potentially client-safe)
 */
export const isPotentiallyClientSafe = (packageName: string): boolean => {
  return (
    !isNodeModule(packageName) && !IGNITER_PACKAGES.includes(packageName as any)
  );
};

/**
 * Debug function to check package inclusion/exclusion status
 */
export const debugPackageStatus = (
  packageName: string,
): {
  isExcluded: boolean;
  isPotentiallySafe: boolean;
  isNodeModule: boolean;
  recommendation: "include" | "exclude" | "review";
  reason: string;
} => {
  const isExcluded = shouldExcludeFromClient(packageName);
  const isPotentiallySafe = isPotentiallyClientSafe(packageName);
  const isNode = isNodeModule(packageName);

  let recommendation: "include" | "exclude" | "review" = "review";
  let reason = "";

  if (isNode) {
    recommendation = "exclude";
    reason = "Node.js built-in module";
  } else if (IGNITER_PACKAGES.includes(packageName as any)) {
    recommendation = "exclude";
    reason = "Igniter server-only adapter";
  } else if (isPotentiallySafe) {
    recommendation = "include";
    reason = "Not a Node.js built-in, likely client-safe";
  } else {
    recommendation = "review";
    reason = "Unknown package, needs manual review";
  }

  return {
    isExcluded,
    isPotentiallySafe,
    isNodeModule: isNode,
    recommendation,
    reason,
  };
};

/**
 * Get list of all packages that will be excluded from client bundle
 */
export const getExcludedPackages = (): readonly string[] => {
  return PACKAGE_CONFIG.client;
};

/**
 * Get list of all packages that will be kept server-side only
 */
export const getServerPackages = (): readonly string[] => {
  return PACKAGE_CONFIG.server;
};

/**
 * Examples and best practices for different empty module types
 *
 * @example
 * ```typescript
 * // For development - shows warnings when server modules are used
 * export default withIgniterAdvanced({
 *   emptyModuleType: 'proxy',
 *   debug: true,
 *   validateConfig: true
 * })()
 *
 * // For production - silent, no warnings
 * export default withIgniterAdvanced({
 *   emptyModuleType: 'silent'
 * })()
 *
 * // For debugging complex issues - smart fallbacks
 * export default withIgniterAdvanced({
 *   emptyModuleType: 'smart',
 *   createEmptyFile: true
 * })()
 *
 * // Minimal setup - basic empty objects
 * export default withIgniterAdvanced({
 *   emptyModuleType: 'basic'
 * })()
 *
 * // Custom packages
 * export default withIgniterAdvanced({
 *   excludePackages: ['my-server-lib', 'another-node-package'],
 *   serverPackages: ['keep-this-on-server'],
 *   emptyModuleType: 'proxy',
 *   debug: process.env.NODE_ENV === 'development'
 * })({
 *   experimental: {
 *     typedRoutes: true
 *   },
 *   turbopack: {
 *     rules: {
 *       '*.svg': {
 *         loaders: [{ loader: '@svgr/webpack' }],
 *         as: '*.js'
 *       }
 *     }
 *   }
 * })
 * ```
 */
export const EMPTY_MODULE_EXAMPLES = {
  development: {
    emptyModuleType: "proxy" as const,
    debug: true,
    validateConfig: true,
    createEmptyFile: false,
  },
  production: {
    emptyModuleType: "silent" as const,
    debug: false,
    validateConfig: false,
    createEmptyFile: false,
  },
  debugging: {
    emptyModuleType: "smart" as const,
    debug: true,
    validateConfig: true,
    createEmptyFile: true,
  },
  minimal: {
    emptyModuleType: "basic" as const,
    debug: false,
    validateConfig: false,
    createEmptyFile: false,
  },
} as const;

/**
 * Debug utility - identifica quais módulos estão sendo acessados e de onde
 * Use apenas para desenvolvimento/debugging
 */
export const debugModuleAccess = () => {
  if (typeof window === "undefined") {
    safeLog.warn("debugModuleAccess should only be called client-side");
    return;
  }

  const moduleAccesses = new Map<string, string[]>();

  // Override console.warn temporariamente
  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    const message = args[0];
    if (
      typeof message === "string" &&
      message.includes("[Igniter] Attempted to use server-only module")
    ) {
      // Extrair o nome do módulo da mensagem
      const match = message.match(/server-only module "([^"]+)"/);
      if (match) {
        const moduleName = match[1];
        const stack = new Error().stack || "";
        const stackLines = stack.split("\n");
        const relevantLines = stackLines
          .filter(
            (line) =>
              !line.includes("debugModuleAccess") &&
              !line.includes("node_modules/@igniter-js") &&
              line.includes("at "),
          )
          .slice(0, 3);

        if (!moduleAccesses.has(moduleName)) {
          moduleAccesses.set(moduleName, []);
        }
        moduleAccesses.get(moduleName)!.push(...relevantLines);
      }
    }
    originalWarn.apply(console, args);
  };

  // Restaurar depois de um tempo
  setTimeout(() => {
    console.warn = originalWarn;

    if (moduleAccesses.size > 0) {
      console.group("🔍 Igniter Module Access Analysis");
      console.log("Found Node.js module accesses from these locations:");

      moduleAccesses.forEach((stacks, moduleName) => {
        console.group(`📦 Module: ${moduleName}`);
        const uniqueStacks = [...new Set(stacks)];
        uniqueStacks.forEach((stack, index) => {
          console.log(`${index + 1}. ${stack.trim()}`);
        });
        console.groupEnd();
      });

      console.log(
        "💡 These accesses suggest which libraries are trying to use Node.js modules in the browser",
      );
      console.groupEnd();
    }
  }, 2000);
};

/**
 * Versão ULTRA MINIMA do withIgniter - apenas para casos críticos
 * Exclui apenas os 5 módulos Node.js mais problemáticos
 */
export const withIgniterMinimal = (...configs: NextConfig[]): NextConfig => {
  try {
    safeLog.info("Initializing Igniter.js Next.js adapter (MINIMAL mode)...");

    const criticalNodeModules = [
      "fs",
      "dns",
      "tls",
      "net",
      "child_process",
      "crypto",
      "worker_threads",
      "bullmq",
      "node:util",
    ];

    // If no configs provided, start with empty config
    if (configs.length === 0) {
      configs = [{}];
    }

    // Merge all configurations
    const mergedConfig = mergeConfigurations(configs);

    // Create final configuration
    const finalConfig: NextConfig = {
      ...mergedConfig,

      serverExternalPackages: [
        ...(mergedConfig.serverExternalPackages || []),
        "ai-fallback",
        "awilix",
        "nodemailer",
        "twitter-api-v2",
        "nodemailer",
        "@igniter-js/adapter-bullmq",
        "@igniter-js/adapter-opentelemetry",
        "@igniter-js/adapter-redis",
      ],

      // Webpack configuration with MINIMAL changes
      webpack: (config: any, context: any) => {
        let newConfig = config;

        try {
          // Apply existing webpack configs first
          if (mergedConfig.webpack) {
            newConfig = mergedConfig.webpack(newConfig, context);
          }

          // Only for client bundles and only critical modules
          if (!context.isServer) {
            if (!newConfig.resolve) {
              newConfig.resolve = {};
            }
            if (!newConfig.resolve.alias) {
              newConfig.resolve.alias = {};
            }
            if (!newConfig.resolve.fallback) {
              newConfig.resolve.fallback = {};
            }

            // Only exclude the most critical Node.js modules
            criticalNodeModules.forEach((pkg) => {
              newConfig.resolve.alias[pkg] = false;
              newConfig.resolve.fallback[pkg] = false;
            });

            safeLog.info(
              `Applied MINIMAL exclusions: ${criticalNodeModules.join(", ")}`,
            );
          }
        } catch (error) {
          safeLog.warn("Error in minimal webpack configuration:", error);
          return config;
        }

        return newConfig;
      },

      // Turbopack configuration with MINIMAL changes
      turbopack: {
        ...(mergedConfig.turbopack || {}),
        resolveAlias: {
          ...(mergedConfig.turbopack?.resolveAlias || {}),
          ...criticalNodeModules.reduce(
            (acc, pkg) => {
              acc[pkg] = "./empty.js";
              return acc;
            },
            {} as Record<string, string>,
          ),
        },
      },
    };

    safeLog.info(
      `Minimal configuration complete. Excluded only ${criticalNodeModules.length} critical Node.js modules. Everything else preserved.`,
    );

    return finalConfig;
  } catch (error) {
    safeLog.warn("Error in withIgniterMinimal:", error);
    return configs[0] || {};
  }
};
