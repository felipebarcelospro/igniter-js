import type { IgniterCollectionViewDataHook } from "src/types";

const analyticsHook: IgniterCollectionViewDataHook = async ({ manager }) => {
  const posts = await manager.posts.findMany();

  return {
    posts: posts.map((item: any) => ({ ...item, enriched: true })),
    customStat: 100,
    source: 'file-hook'
  };
};

export default analyticsHook;
