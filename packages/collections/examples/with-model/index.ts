import z from "zod";
import { IgniterCollections, IgniterCollectionModel } from "../../src/index"
import { BunFsAdapter } from "../../src/adapters/bun-fs.adapter";

const postSchema = z.object({
  title: z.string(),
  published: z.boolean(),
});

type PostSchema = z.infer<typeof postSchema>;

const Posts = IgniterCollectionModel.create("posts")
  .withPatterns([".content/posts/{id}.mdx"])
  .withSchema(postSchema)
  .onCreated(({ value }) => {
    console.log("Post created:", value.id);
    return value;
  })
  .onUpdated(({ newValue, previousValue }) => {
    console.log("Post updated:", newValue.id);
    return newValue;
  })
  .onList(({ values }) => {
    console.log(`Listed ${values.length} posts`);
    return values;
  })
  .onRead(({ value }) => {
    console.log("Read post:", value.id);
    return value;
  })
  .build();

const manager = IgniterCollections.create()
  .withAdapter(new BunFsAdapter())
  .withBasePath(process.cwd())
  .addCollection(Posts)
  .build();

async function runSample() {
  const earlyPosts = await manager.collections.get('posts').findMany();
  console.log("Early Posts:", earlyPosts);

  // Create a new post
  const newPost = await manager.collections.get('posts').create({
    data: {
      title: "My First Post",
      content: "This is the content of my first post.",
      published: true,
    },
  });
  console.log("Created Post:", newPost);

  // Find the post by ID
  const foundPost = await manager.collections.get('posts').findUnique({
    where: { id: newPost.id },
  });

  console.log("Found Post:", foundPost?.id);
  // Update the post
  const updatedPost = await manager.collections.get('posts').update({
    where: { id: newPost.id },
    data: {
      published: false,
    }
  });

  console.log("Updated Post:", updatedPost.id);

  const definitions = manager.collections.list();
  console.log("Collection Definitions:", definitions);

  // // Delete the post
  // await collections.posts.delete({
  //   where: { id: newPost.id },
  // });
  // console.log("Deleted Post with ID:", newPost.id);

  // create a fake delay on second thread with 5s
  await new Promise((resolve) => setTimeout(resolve, 5000));

  const listPosts = await manager.collections.get('posts').findMany();

  console.log("List Posts:", listPosts);
}

runSample().catch((error) => {
  console.error("Error running sample:", error);
});

