import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { AppRouter } from './igniter.router'

const handler = (req: Request) => {
  const url = new URL(req.url);
  const IGNITER_API_BASE_PATH = process.env.IGNITER_API_BASE_PATH || "/api/v1";

  if (url.pathname.startsWith(IGNITER_API_BASE_PATH)) return AppRouter.handler(req);

  return new Response("Not Found", { status: 404 });
};

const port = 8000;

serve(handler, { port });

console.log(`🚀 Server running at http://localhost:${port}/`);
