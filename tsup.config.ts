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
  
  // Configuração específica para o código client-side
  {
    entry: ['src/client/index.ts'], // Use um array em vez de um objeto
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    treeshake: true,
    outDir: 'dist/client',
    external: ['react', 'react-dom'],
    onSuccess: "node scripts/add-client-directive.js", // Adiciona a diretiva 'use client' nos arquivos de saída
    esbuildOptions(options) {
      options.banner = {
        js: "'use client';",
      };
    },
  }
])