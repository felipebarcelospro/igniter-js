import { IgniterCollections } from "../../src/index"
import { BunFsAdapter } from "../../src/adapters/bun-fs.adapter";

const collections = IgniterCollections.create()
  .withAdapter(new BunFsAdapter())
  .withBasePath(process.cwd())
  .withSchemaRegistry(['.'], { autoWatch: true, filePattern: '*.fractal.schema.json' })
  .build();

async function runSample() {
  // Create a new post
  const newPost = await collections.posts.create({
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
  const foundPost = await collections.posts.findUnique({
    where: { id: newPost.id },
  });

  console.log("Found Post:", foundPost?.id);
  // Update the post
  const updatedPost = await collections.posts.update({
    where: { id: newPost.id },
    data: { published: false },
  });

  console.log("Updated Post:", updatedPost.id);

  const definitions = collections.definitions();
  console.log("Collection Definitions:", definitions);

  // // Delete the post
  // await collections.posts.delete({
  //   where: { id: newPost.id },
  // });
  // console.log("Deleted Post with ID:", newPost.id);
}

runSample().catch((error) => {
  collections.stopSchemaWatching();
  console.error("Error running sample:", error);
});