import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    // Main entry point
    'index': 'src/index.ts',

    // Adapters barrel
    'adapters/index': 'src/adapters/index.ts',

    // Individual adapters (for @igniter-js/bot/adapters/*)
    'adapters/redis.adapter': 'src/adapters/redis.adapter.ts'
  },
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: [
    '@igniter-js/core',
    'ioredis',
  ],
})
