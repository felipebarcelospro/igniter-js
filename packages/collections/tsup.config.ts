import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'adapters/bun': 'src/adapters/bun.ts',
    'adapters/node': 'src/adapters/node.ts',
    'adapters/mock': 'src/adapters/mock.ts',
    'telemetry/index': 'src/telemetry/index.ts',
    shim: 'src/shim.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: [
    '@igniter-js/common',
    '@igniter-js/telemetry',
    '@standard-schema/spec',
    'bun',
    'gray-matter',
    'uuid',
    'zod',
    'ajv'
  ],
})
