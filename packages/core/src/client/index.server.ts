// Server-specific barrel file
// React-specific exports (work in server environment)
export { IgniterProvider, useIgniterQueryClient } from "./igniter.context";
export { useStream } from "./igniter.hooks";

// Server-specific createIgniterClient (uses router.$caller directly)
export { createIgniterClient } from './igniter.client.server'; 