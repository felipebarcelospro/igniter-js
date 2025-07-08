import { defineConfig } from 'tsup'

export default defineConfig([
  // Configuração para o código principal (server-side)
  {
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: {
      resolve: true,
    },
    splitting: false,
    sourcemap: true,
    clean: true,
    treeshake: true,
    external: [
      'react', 
      'react-dom',
    ],
  },

  // Configuração para o código dos adapters (server-side)
  {
    entry: ['src/adapters/index.ts'],
    format: ['cjs', 'esm'],
    outDir: 'dist/adapters',
    dts: {
      resolve: true,
    },
    splitting: false,
    sourcemap: true,
    clean: true,
    treeshake: true,
    external: ['react', 'react-dom'],
  },

  // Configuração para o código dos plugins (server-side)
  {
    entry: ['src/plugins/index.ts'],
    format: ['cjs', 'esm'],
    outDir: 'dist/plugins',
    dts: {
      resolve: true,
    },
  },
  
  // Configuração para hooks React (com banner 'use client')
  {
    entry: {
      'igniter.hooks': 'src/client/igniter.hooks.ts',
    },
    format: ['esm'],
    dts: {
      resolve: true,
    },
    splitting: true,
    outDir: 'dist/client',
    external: [
      'react', 
      'react-dom',
    ],
    esbuildOptions(options) {
      options.banner = {
        js: '"use client"',
      }
    },
  },
  // Configuração para context React (com banner 'use client')
  {
    entry: {
      'igniter.context': 'src/client/igniter.context.tsx',
    },
    format: ['esm'],
    dts: {
      resolve: true,
    },
    splitting: true,
    outDir: 'dist/client',
    external: [
      'react', 
      'react-dom',
    ],    
    esbuildOptions(options) {
      options.banner = {
        js: '"use client"',
      }
    },
  },
  // Configuração para client (browser client, server client e barrel files)
  {
    entry: {
      'index': 'src/client/index.ts',
      'index.server': 'src/client/index.server.ts',
      'index.browser': 'src/client/index.browser.ts',
    },
    format: ['cjs', 'esm'],
    dts: {
      resolve: true,
    },
    treeshake: true,
    splitting: true,
    outDir: 'dist/client',
    external: [
      'react', 
      'react-dom',
    ],
  }
])