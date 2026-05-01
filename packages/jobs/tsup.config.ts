import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "telemetry/index": "src/telemetry/index.ts",
    "adapters/node": "src/adapters/node.ts",
    "adapters/bun": "src/adapters/bun.ts",
    "adapters/mock": "src/adapters/mock.ts",
    shim: "src/shim.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: [
    "@igniter-js/common",
    "@igniter-js/core",
    "@igniter-js/store",
    "@igniter-js/telemetry",
    "bun:sqlite",
    "bunqueue/client",
    "bullmq",
    "ioredis",
    "zod",
  ],
});
