import { IgniterCollectionView } from "../../../builders/view.builder";

export default IgniterCollectionView.create("dashboard")
  .withTitle("Analytics Dashboard")
  .withMetadata({ icon: "chart", order: 1 })
  .withData(async ({ manager }) => {
    const posts = await manager.posts.findMany();
    return {
      posts,
      total: posts.length,
    };
  })
  .withTree([
    { component: "Metric", valuePath: "/total" },
    { component: "Table", valuePath: "/posts" }
  ])
  .build();
