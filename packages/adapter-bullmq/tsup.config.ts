import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  outDir: 'dist',
  clean: true,
  external: ['@igniter-js/core', '@igniter-js/common'],
  noExternal: ['@igniter-js/core', '@igniter-js/common']
}); 
