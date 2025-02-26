import type { IgniterRouter } from "../../types"

/**
 * Adapter function to convert an IgniterRouter instance into Next.js route handlers
 * 
 * @param router - An instance of IgniterRouter that will handle the incoming requests
 * @returns An object containing HTTP method handlers compatible with Next.js route handlers
 * @example
 * ```typescript
 * const router = new IgniterRouter()
 * export const { GET, POST, PUT, DELETE, PATCH } = nextRouteHandlerAdapter(router)
 * ```
 * 
 * @remarks
 * This adapter supports the following HTTP methods:
 * - GET
 * - POST 
 * - PUT
 * - DELETE
 * - PATCH
 * 
 * Each method handler receives a Next.js Request object and forwards it to the router's handler
 */
export const nextRouteHandlerAdapter = (router: IgniterRouter<any, any>) => {
  return {
    GET: (request: Request) => {
      return router.handler(request)
    },
    POST: (request: Request) => {
      return router.handler(request)
    },
    PUT: (request: Request) => {
      return router.handler(request)
    },
    DELETE: (request: Request) => {
      return router.handler(request)
    },
    PATCH: (request: Request) => {
      return router.handler(request)
    },
  }
}