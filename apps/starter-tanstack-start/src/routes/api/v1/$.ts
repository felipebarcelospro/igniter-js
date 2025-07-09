import { createFileRoute } from '@tanstack/react-router'
import { AppRouter } from '@/igniter.router'

/**
 * API route handler for Igniter.js using TanStack Start.
 *
 * This file acts as a "catch-all" for any requests made to `/api/v1/*`.
 * It intercepts the incoming web standard `Request` object and passes it
 * to the Igniter.js router for processing.
 *
 * @see https://github.com/felipebarcelospro/igniter-js
 * @see https://tanstack.com/start/latest/docs/framework/api-routes
 */

/**
 * The core handler function that bridges TanStack Start and Igniter.js.
 * @param request - The incoming `Request` object from the client.
 * @returns A standard `Response` object.
 */
const igniterApiHandler = async ({ request }: { request: Request }) => {
  // 1. Pass the incoming request to the Igniter router's handler.
  const igniterResponse = await AppRouter.handler(request)

  // 2. The Igniter handler returns a standardized response object.
  // We need to convert its body to a string for the Response constructor.
  const body = igniterResponse.body ? JSON.stringify(igniterResponse.body) : null

  // 3. Construct and return a standard Web API Response object.
  return new Response(body, {
    status: igniterResponse.status,
    headers: igniterResponse.headers,
  })
}

// Create the route using TanStack's file-based routing system.
// The path `/api/v1/$` is automatically inferred from this file's location.
export const Route = createFileRoute('/api/v1/$')({
  /**
   * The `loader` function handles GET and HEAD requests.
   * We assign our universal handler to it.
   */
  loader: igniterApiHandler,

  /**
   * The `action` function handles POST, PUT, PATCH, DELETE requests.
   * We assign the same universal handler to it.
   */
  action: igniterApiHandler,
})
