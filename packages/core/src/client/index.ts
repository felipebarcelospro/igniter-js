// React-specific exports (client-side only)
export { IgniterProvider, useIgniterQueryClient } from "./igniter.context";
export { useRealtime } from "./igniter.hooks";

// Re-export createIgniterClient - will be environment-aware via imports
export { createIgniterClient } from './igniter.client.browser';
