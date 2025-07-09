import { serve } from "bun";
import { AppRouter } from './igniter.router'

const server = serve({
  routes: {
    // Serve Igniter.js Router
    "/api/v1/*": AppRouter.handler,
  },
});

console.log(`🚀 Server running at ${server.url}`);
