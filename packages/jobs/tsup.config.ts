import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    // Main entry point
    index: "src/index.ts",
    shim: "src/shim.ts",
    "telemetry/index": "src/telemetry/index.ts",

    // Adapter barrels and implementations
    "adapters/index": "src/adapters/index.ts",
    "adapters/bullmq.adapter": "src/adapters/bullmq.adapter.ts",
    "adapters/memory.adapter": "src/adapters/memory.adapter.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: [
    "@igniter-js/core",
    "@igniter-js/store",
    "@igniter-js/telemetry",
    "bullmq",
    "ioredis",
    "zod",
  ],
});
