import { serve } from "bun";
import { AppRouter } from './igniter.router'

const IGNITER_API_BASE_PATH = process.env.IGNITER_API_BASE_PATH || '/api/v1/'; // Define the base path for the API

const server = serve({
  routes: {
    // Serve Igniter.js Router
    [IGNITER_API_BASE_PATH + "*"]: AppRouter.handler,
  },
});

console.log(`🚀 Server running at ${server.url}`);
