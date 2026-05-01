import { IgniterCollections } from "../../src/index"
import { BunFsAdapter } from "../../src/adapters/bun";

const collections = IgniterCollections.create()
  .withAdapter(new BunFsAdapter())
  .withBasePath(process.cwd())
  .withSchemaRegistry(['.'], { autoWatch: true, filePattern: '*.fractal.schema.json' })
  .build();

async function debug() {
  console.log("CWD:", process.cwd());
  console.log("Starting schema watching...");
  await collections.startSchemaWatching();

  console.log("Schema watching started.");
  const definitions = collections.definitions();
  console.log("Definitions:", JSON.stringify(definitions, null, 2));

  if (collections.posts) {
    console.log("SUCCESS: collections.posts is defined");
  } else {
    console.log("FAILURE: collections.posts is undefined");
  }

  collections.stopSchemaWatching();
}

debug().catch(console.error);
