import { defineConfig } from 'tsup'

/**
 * tsup build configuration for @igniter-js/bot
 *
 * Goals:
 *  - Generate both ESM and CJS builds for wide compatibility
 *  - Emit type declarations (.d.ts + maps)
 *  - Keep external peer/runtime deps (e.g. zod) out of the bundle
 *  - Generate all entry points declared in package.json exports
 *  - Use .mjs extension for ESM files (as expected by package.json)
 *  - Use .cjs extension for CJS files
 *
 * Notes:
 *  - Package.json exports require multiple entry points to be generated
 *  - Adapters remain tree-shakeable because we avoid side-effects
 *  - All exports must be available for proper module resolution
 *  - ESM files must use .mjs extension to match package.json expectations
 */
export default defineConfig({
  entry: {
    // Main entry point
    'index': 'src/index.ts',

    // Adapters barrel
    'adapters/index': 'src/adapters/index.ts',

    // Individual adapters (for @igniter-js/bot/adapters/*)
    'adapters/telegram/index': 'src/adapters/telegram/index.ts',
    'adapters/whatsapp/index': 'src/adapters/whatsapp/index.ts',

    // Middlewares barrel (for @igniter-js/bot/middlewares)
    'middlewares/index': 'src/middlewares/index.ts',

    // Plugins barrel (for @igniter-js/bot/plugins)
    'plugins/index': 'src/plugins/index.ts',

    // Stores barrel (for @igniter-js/bot/stores)
    'stores/index': 'src/stores/index.ts',

    // Types barrel (for @igniter-js/bot/types)
    'types/index': 'src/types/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'node18',
  outDir: 'dist',
  // Mark libraries we do not want to bundle (keep as dependencies / peer)
  external: [
    'zod',
  ],
  // Ensures we don't accidentally bundle Node built-ins or optional deps
  noExternal: [],
  splitting: false, // Disable splitting to maintain file structure
  treeshake: true,
  minify: false, // Keep unminified for easier debugging (can revisit for stable)
  skipNodeModulesBundle: true,
  // Use .mjs extension for ESM files to match package.json exports
  outExtension({ format }) {
    return {
      js: format === 'esm' ? '.mjs' : '.cjs',
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
  },
  banner: {
    js: `/**
* @igniter-js/bot
* Build: ${new Date().toISOString()}
* Format: {format}
*/`,
  },
  esbuildOptions(options) {
    // Helpful for library debugging
    options.logOverride = { 'this-is-undefined-in-esm': 'silent' }
  },
  onSuccess: 'echo Build completed for @igniter-js/bot',
})
