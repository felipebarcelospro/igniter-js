import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
  external: [
    '@igniter-js/core',
    '@opentelemetry/api',
    '@opentelemetry/sdk-node',
    '@opentelemetry/exporter-jaeger',
    '@opentelemetry/exporter-prometheus',
    '@opentelemetry/exporter-otlp-http'
  ]
}); 