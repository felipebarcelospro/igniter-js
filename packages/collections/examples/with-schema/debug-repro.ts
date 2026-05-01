import { IgniterCollections } from "../../src/index"
import { BunFsAdapter } from "../../src/adapters/bun";

const collections = IgniterCollections.create()
  .withAdapter(new BunFsAdapter())
  .withBasePath(process.cwd())
  .withWatcher('.', {
    collections: '*.fractal.schema.json',
    autoWatch: true,
  })
  .build();

async function debug() {
  console.log("CWD:", process.cwd());
  console.log("Starting schema watching...");
  await collections.startWatching();

  console.log("Watching started.");
  const definitions = collections.definitions();
  console.log("Definitions:", JSON.stringify(definitions, null, 2));

  if (collections.posts) {
    console.log("SUCCESS: collections.posts is defined");
  } else {
    console.log("FAILURE: collections.posts is undefined");
  }

  collections.stopWatching();
}

debug().catch(console.error);
