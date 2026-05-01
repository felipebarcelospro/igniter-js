import { IgniterCollectionView } from "../../../builders/view.builder";

export default IgniterCollectionView.create("dashboard")
  .withTitle("Analytics Dashboard")
  .withGetData(async ({ manager }) => {
    const posts = await manager.posts.findMany();
    return {
      items: posts,
      stats: { total: posts.length }
    };
  })
  .withTree([
    { component: "Metric", valuePath: "/stats/total" }
  ])
  .build();
