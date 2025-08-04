import { igniter } from '@/igniter'
import { messageController } from './features/message'

/**
 * @description Main application router configuration
 * @see https://github.com/felipebarcelospro/igniter-js
 */
export const AppRouter = igniter.router({
  controllers: {
    message: messageController
  }
})

export type AppRouterType = typeof AppRouter
