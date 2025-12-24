import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    // Main entry point
    'index': 'src/index.ts',

    // Shim for server-only protection
    'shim': 'src/shim.ts',

    // Adapters barrel
    'adapters/index': 'src/adapters/index.ts',

    // Individual adapters
    'adapters/logger.adapter': 'src/adapters/logger.adapter.ts',
    'adapters/store.adapter': 'src/adapters/store.adapter.ts',
    'adapters/http.adapter': 'src/adapters/http.adapter.ts',
    'adapters/memory.adapter': 'src/adapters/memory.adapter.ts',
    'adapters/mock.adapter': 'src/adapters/mock.adapter.ts',
    'adapters/sentry.adapter': 'src/adapters/sentry.adapter.ts',
    'adapters/slack.adapter': 'src/adapters/slack.adapter.ts',
    'adapters/discord.adapter': 'src/adapters/discord.adapter.ts',
    'adapters/telegram.adapter': 'src/adapters/telegram.adapter.ts',
    'adapters/otlp.adapter': 'src/adapters/otlp.adapter.ts',
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
