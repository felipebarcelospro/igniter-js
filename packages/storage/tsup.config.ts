import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "adapters/index": "src/adapters/index.ts",
    "telemetry/index": "src/telemetry/index.ts",
    shim: "src/shim.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: [
    "@igniter-js/core",
    "@igniter-js/telemetry",
    "@aws-sdk/client-s3",
    "@aws-sdk/lib-storage",
    "@google-cloud/storage",
  ],
});
