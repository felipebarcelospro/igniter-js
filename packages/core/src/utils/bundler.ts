/**
 * Options for smart bundling based on environment or target.
 * Each property is a function returning the implementation for that environment.
 */
export interface BundlingOptions {
  /** Implementation for server-side bundles */
  server?: () => any;
  /** Implementation for client-side bundles */
  client?: () => any;
  /** Implementation for server-side rendering (SSR) */
  ssr?: () => any;
  /** Implementation for development mode */
  dev?: () => any;
  /** Implementation for production mode */
  prod?: () => any;
  /** Implementation for test environment */
  test?: () => any;
}

/**
 * Creates a function that selects the correct implementation based on the current
 * bundling environment (server, client, dev, prod, test, etc).
 * 
 * This function is intended to be processed by a bundler (e.g., webpack) to eliminate
 * dead code branches at build time.
 *
 * @template T - The return type of the selected implementation
 * @param options - An object containing environment-specific implementations
 * @returns A function that returns the correct implementation for the current environment
 *
 * @example
 * ```typescript
 * const getApi = createSmartFunction({
 *   server: () => require('./api.server'),
 *   client: () => require('./api.client'),
 *   dev: () => require('./api.dev'),
 * });
 * ```
 */
export function createDynamicBundlerFunction<T>(options: BundlingOptions): () => T {
  // This will be processed by the webpack loader to eliminate unnecessary branches
  return () => {
    // Build-time conditions - webpack will eliminate dead code
    if (process.env.__BUNDLE_TARGET__ === 'server') {
      if (process.env.NODE_ENV === 'development' && options.dev) {
        return options.dev();
      }
      return options.server?.() || options.ssr?.();
    }

    if (process.env.__BUNDLE_TARGET__ === 'client') {
      if (process.env.NODE_ENV === 'development' && options.dev) {
        return options.dev();
      }
      return options.client?.();
    }

    if (process.env.NODE_ENV === 'test') {
      return options.test?.();
    }

    throw new Error('No suitable implementation found');
  };
}

/**
 * Marks a code block to be included only if the given condition matches the current
 * bundling environment. This is intended to be processed at build time, not runtime.
 *
 * @param condition - The environment condition ('server', 'client', 'dev', or 'prod')
 * @param code - The code block to include if the condition matches
 * @returns An object representing the conditional bundle macro
 */
export function bundleIf(
  condition: 'server' | 'client' | 'dev' | 'prod',
  code: () => any
) {
  // Will be replaced by the webpack loader
  return {
    __bundleMacro: 'conditional',
    condition,
    code: code.toString(),
  };
}

/**
 * Marks a dynamic import to be included only if the given condition matches.
 * This is intended to be processed at build time, not runtime.
 *
 * @param condition - The environment condition as a string
 * @param modulePath - The module path to import if the condition matches
 * @returns An object representing the import bundle macro
 */
export function importIf(condition: string, modulePath: string) {
  return {
    __bundleMacro: 'import',
    condition,
    modulePath,
  };
}

/**
 * Marks a set of code blocks to be included based on a switch of the current
 * bundling environment. This is intended to be processed at build time, not runtime.
 *
 * @template T - The return type of the selected case
 * @param cases - An object mapping environment names to code blocks
 * @returns An object representing the switch bundle macro, cast as T
 */
export function bundleSwitch<T>(cases: Record<string, () => T>): T {
  return {
    __bundleMacro: 'switch',
    cases: Object.fromEntries(
      Object.entries(cases).map(([k, v]) => [k, v.toString()])
    ),
  } as T;
}