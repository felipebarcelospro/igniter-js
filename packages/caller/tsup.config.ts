import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'telemetry/index': 'src/telemetry/index.ts',
    'adapters/index': 'src/adapters/index.ts',
    'client/index': 'src/client/index.ts',
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
    'zod',
    'react',
    'react/jsx-runtime',
  ],
})
