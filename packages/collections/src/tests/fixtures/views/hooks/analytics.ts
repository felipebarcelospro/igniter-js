import type { IgniterCollectionViewDataHook } from "src/types";


const analyticsHook: IgniterCollectionViewDataHook = async (context) => {
  const { items = [] } = context;
  
  return {
    items: items.map(item => ({ ...item, enriched: true })),
    stats: {
      customStat: 100
    },
    extra: {
      source: 'file-hook'
    }
  };
};

export default analyticsHook;
