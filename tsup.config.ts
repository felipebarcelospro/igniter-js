import { defineConfig } from 'tsup'

export default defineConfig([
  // Configuração para o código principal (server-side)
  {
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
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
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    treeshake: true,
    external: ['react', 'react-dom'],
  },
  
  // Configuração específica para o código client-side
  {
    entry: {
      'igniter.context': 'src/client/igniter.context.tsx',
      'igniter.hooks': 'src/client/igniter.hooks.ts',
      'igniter.client': 'src/client/igniter.client.ts',
    },
    format: ['cjs', 'esm'],
    dts: {
      entry: 'src/client/index.ts',
    },
    splitting: false,
    sourcemap: true,
    treeshake: true,
    outDir: 'dist/client',
    external: ['react', 'react-dom'],
    onSuccess: "node scripts/post-build.js", // Adiciona a diretiva 'use client' nos arquivos de saída
    esbuildOptions(options) {
      options.banner = {
        js: "'use client';",
      };
    },
  }
])