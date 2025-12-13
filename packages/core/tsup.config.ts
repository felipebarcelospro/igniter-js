import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: ["cjs", "esm"],
    dts: {
      resolve: true,
    },
    splitting: false,
    sourcemap: true,
    clean: true,
    treeshake: true,
    external: ["react", "react-dom"],
  },
  {
    entry: ["src/adapters/index.ts"],
    format: ["cjs", "esm"],
    outDir: "dist/adapters",
    dts: {
      resolve: true,
    },
    splitting: false,
    sourcemap: true,
    clean: true,
    treeshake: true,
    external: ["react", "react-dom"],
  },
  {
    entry: ["src/plugins/index.ts"],
    format: ["cjs", "esm"],
    outDir: "dist/plugins",
    dts: {
      resolve: true,
    },
  },
  {
    entry: {
      "igniter.hooks": "src/client/igniter.hooks.ts",
    },
    format: ["esm"],
    dts: {
      resolve: true,
    },
    splitting: true,
    outDir: "dist/client",
    external: ["react", "react-dom"],
  },
  {
    entry: {
      "igniter.context": "src/client/igniter.context.tsx",
    },
    format: ["esm"],
    dts: {
      resolve: true,
    },
    splitting: true,
    outDir: "dist/client",
    external: ["react", "react-dom"],
  },
  {
    entry: {
      index: "src/client/index.ts",
      "index.server": "src/client/index.server.ts",
      "index.browser": "src/client/index.browser.ts",
    },
    format: ["cjs", "esm"],
    dts: {
      resolve: true,
    },
    treeshake: true,
    splitting: true,
    outDir: "dist/client",
    external: ["react", "react-dom"],
  },
]);
