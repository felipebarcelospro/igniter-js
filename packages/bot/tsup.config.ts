import { defineConfig } from 'tsup'

/**
 * tsup build configuration for @igniter-js/bot
 *
 * Goals:
 *  - Generate both ESM and CJS builds for wide compatibility
 *  - Emit type declarations (.d.ts + maps)
 *  - Keep external peer/runtime deps (e.g. zod) out of the bundle
 *  - Allow future addition of more entry points (adapters, etc.)
 *
 * Notes:
 *  - Primary public surface should be funneled through `src/index.ts`
 *    which must re-export Bot, adapters and types for optimal DX.
 *  - Adapters remain tree-shakeable because we avoid side-effects
 *    and expose granular exports in package.json.
 */
export default defineConfig({
  entry: [
    'src/index.ts', // (to be created / should barrel-export everything)
  ],
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
  splitting: true,
  treeshake: true,
  minify: false, // Keep unminified for easier debugging (can revisit for stable)
  skipNodeModulesBundle: true,
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
