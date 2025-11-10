import type { IgniterRouter } from "@/types"

/**
 * The core handler function that bridges TanStack Start and Igniter.js.
 * @param router - The Igniter router instance.
 * @returns A standard `Response` object.
 */
export const tanstackStartRouteHandlerAdapter = (router: Omit<IgniterRouter<any, any, any, any, any>, 'caller'>) => {
  return {
    GET: ({ request }: { request: Request }) => {
      return router.handler(request)
    },
    POST: ({ request }: { request: Request }) => {
      return router.handler(request)
    },
    PUT: ({ request }: { request: Request }) => {
      return router.handler(request)
    },
    DELETE: ({ request }: { request: Request }) => {
      return router.handler(request)
    },
    PATCH: ({ request }: { request: Request }) => {
      return router.handler(request)
    },
  }
}