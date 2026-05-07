import { IgniterCollections } from "../../src/index"
import { BunFsAdapter } from "../../src/adapters/bun-fs.adapter";

const manager = IgniterCollections.create()
  .withAdapter(new BunFsAdapter())
  .withBasePath(process.cwd())
  .withWatcher('.', {
    collections: '*.fractal.schema.json',
    autoWatch: true,
  })
  .build();

async function runSample() {
  // Create a new post
  const newPost = await manager.collections.get('posts').create({
    data: {
      title: "My First Post",
      content: "This is the content of my first post.",
      published: true,
      tags: ["tutorial", "introduction"],
      author: [
        {
          name: "John Doe",
          email: "test@gmail.com"
        }
      ]
    },
  });
  console.log("Created Post:", newPost.id);

  // Find the post by ID
  const foundPost = await manager.collections.get('posts').findUnique({
    where: { id: newPost.id },
  });

  console.log("Found Post:", foundPost?.id);
  // Update the post
  const updatedPost = await manager.collections.get('posts').update({
    where: { id: newPost.id },
    data: { published: false },
  });

  console.log("Updated Post:", updatedPost.id);

  const definitions = manager.collections.entries();
  console.log("Collection Definitions:", definitions);

  // // Delete the post
  // await manager.collections.get('posts').delete({
  //   where: { id: newPost.id },
  // });
  // console.log("Deleted Post with ID:", newPost.id);
}

runSample().catch((error) => {
  manager.watcher.stop();
  console.error("Error running sample:", error);
});