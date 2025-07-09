// Browser-specific barrel file
// React-specific exports (client-side only)
export { IgniterProvider, useIgniterQueryClient } from "./igniter.context";
export { useRealtime } from "./igniter.hooks";

// Browser-specific createIgniterClient (uses fetch + hooks)
export { createIgniterClient } from './igniter.client.browser';
