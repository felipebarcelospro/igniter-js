import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { AppRouter } from './igniter.router'

const handler = (req: Request) => {
  const url = new URL(req.url);

  if (url.pathname.startsWith("/api/v1/")) {
    return AppRouter.handler(req);
  }

  return new Response("Not Found", { status: 404 });
};

const port = 8000;
serve(handler, { port });

console.log(`🚀 Server running at http://localhost:${port}/`);
