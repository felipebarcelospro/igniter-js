import { igniter } from '@/igniter'
import { exampleController } from '@/features/example'

/**
 * @description Main application router configuration
 * @see https://github.com/felipebarcelospro/igniter-js
 */
export const AppRouter = igniter.router({
  // The `basePath` is used by the client to construct the full API URL.
  // It should match the path where the API handler is mounted.
  controllers: {
    example: exampleController
  }
})

// This exports the type of the router, which is used by the client for type safety.
export type AppRouterType = typeof AppRouter
