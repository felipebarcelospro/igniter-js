import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: [
    "@modelcontextprotocol/sdk",
    "zod",
    "@octokit/rest",
    "axios",
    "fast-xml-parser",
    "turndown",
  ],
});
