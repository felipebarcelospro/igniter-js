import { BunFsAdapter } from "../../src/adapters/bun";

const adapter = new BunFsAdapter();
const basePath = process.cwd();
const pattern = "*.fractal.schema.json";

async function test() {
  console.log("BasePath:", basePath);
  console.log("Pattern:", pattern);

  const files = await adapter.list(basePath, pattern);
  console.log("Files found:", files);

  if (files.length > 0) {
    const content = await adapter.read(files[0]);
    console.log("First file content length:", content?.length);
  }
}

test();
