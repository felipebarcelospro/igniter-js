import { igniter } from '@/igniter'
import { exampleController } from '@/features/example'

/**
 * @description Main application router configuration
 * @see https://github.com/felipebarcelospro/igniter-js
 */
export const AppRouter = igniter.router({
  controllers: {
    example: exampleController
  }
})

export type AppRouterType = typeof AppRouter
