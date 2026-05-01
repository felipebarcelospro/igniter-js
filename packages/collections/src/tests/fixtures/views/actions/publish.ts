import type { IgniterCollectionViewActionHandler } from "src/types";


const publishAction: IgniterCollectionViewActionHandler = async (context) => {
  const { params } = context;
  
  return {
    success: true,
    data: { 
      postId: params.postId, 
      status: 'published' 
    },
    updates: {
      [`/items/${params.postId}/status`]: 'published'
    }
  };
};

export default publishAction;
