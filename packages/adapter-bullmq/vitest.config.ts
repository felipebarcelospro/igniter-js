import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        'src/test/',
        '**/*.test.ts',
        '**/*.spec.ts'
      ]
    },
    testTimeout: 15000,
    hookTimeout: 15000
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@igniter-js/core': path.resolve(__dirname, '../core/src'),
      '@igniter-js/adapter-bullmq': path.resolve(__dirname, './src')
    }
  }
}) 