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
    external: ['react', 'react-dom'],
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
  
  // Configuração unificada para client com arquivos separados para máxima otimização
  {
    entry: {
      'igniter.context': 'src/client/igniter.context.tsx',
      'igniter.hooks': 'src/client/igniter.hooks.ts',
      'igniter.client': 'src/client/igniter.client.ts',
      'igniter.client.browser': 'src/client/igniter.client.browser.ts',
      'igniter.client.server': 'src/client/igniter.client.server.ts',
      'index': 'src/client/index.ts',
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
      // Apenas os imports internos do client (não utils)
      './igniter.hooks',
      './igniter.context',
      './igniter.client',
      './igniter.client.browser',
      './igniter.client.server'
    ]
  }
])