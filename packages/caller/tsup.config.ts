import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'telemetry/index': 'src/telemetry/index.ts',
    'adapters/index': 'src/adapters/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ['@igniter-js/core', '@igniter-js/telemetry', 'zod'],
})
