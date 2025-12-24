import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/adapters/index.ts',
    'src/telemetry/index.ts',
    'src/shim.ts',
  ],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: [
    '@igniter-js/core',
    '@igniter-js/telemetry',
    'zod',
  ],
})
