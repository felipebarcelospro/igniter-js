import { IgniterCollectionModel } from "../../../builders/collection.builder";
import { z } from "zod";

export default IgniterCollectionModel.create("posts")
  .withPatterns([".content/posts/{id}.mdx"])
  .withSchema(z.object({
    title: z.string(),
    publishedAt: z.date(),
  }))
  .build();
