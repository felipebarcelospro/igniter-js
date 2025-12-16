import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    // Main entry point
    'index': 'src/index.ts',

    // Adapters barrel
    'adapters/index': 'src/adapters/index.ts',

    // Individual adapters
    'adapters/logger.adapter': 'src/adapters/logger.adapter.ts',
    'adapters/store.adapter': 'src/adapters/store.adapter.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: [
    '@igniter-js/core',
    '@igniter-js/store',
    'ioredis',
  ],
})
