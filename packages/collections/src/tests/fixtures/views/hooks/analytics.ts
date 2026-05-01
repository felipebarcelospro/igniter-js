import type { IgniterCollectionViewDataHook } from "src/types";

const analyticsHook: IgniterCollectionViewDataHook = async ({ manager }) => {
  const posts = await manager.posts.findMany();

  return {
    items: posts.map((item: any) => ({ ...item, enriched: true })),
    stats: {
      customStat: 100
    },
    extra: {
      source: 'file-hook'
    }
  };
};

export default analyticsHook;
