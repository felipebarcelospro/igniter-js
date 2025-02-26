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
  
  // Configuração específica para o código client-side
  {
    entry: {
      'index': 'src/client/index.ts',
      'igniter.context': 'src/client/igniter.context.tsx',
      'igniter.hooks': 'src/client/igniter.hooks.ts',
      'igniter.client': 'src/client/igniter.client.ts',
    },
    format: ['cjs', 'esm'],
    dts: {
      resolve: true,
    },
    splitting: true, // Habilita o code splitting
    treeshake: true,
    outDir: 'dist/client',
    external: ['react', 'react-dom'],
    esbuildOptions(options) {
      options.banner = {
        js: "'use client';",
      };
      options.bundle = true;
      options.platform = 'neutral';
      options.mainFields = ['module', 'main'];
    },
  }
])