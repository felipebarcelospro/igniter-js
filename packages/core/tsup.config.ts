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
  
  // Uma configuração unificada para client com preserveModules
  {
    entry: {
      'igniter.context': 'src/client/igniter.context.tsx',
      'igniter.hooks': 'src/client/igniter.hooks.ts',
      'igniter.client': 'src/client/igniter.client.ts',
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
      // Importante: marque as importações internas como externas
      './igniter.hooks',
      './igniter.context',
      './igniter.client'
    ]
  }
])