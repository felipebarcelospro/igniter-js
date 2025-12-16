/**
 * @fileoverview Public queue entry point for @igniter-js/jobs
 * @module @igniter-js/jobs/core/igniter-queue
 */

import { IgniterQueueBuilder } from '../builders/igniter-queue.builder'

/**
 * Queue facade that exposes the fluent queue builder API.
 */
export class IgniterQueue {
  /**
   * Creates a new queue builder for the given name.
   *
   * @example
   * ```typescript
   * const queue = IgniterQueue.create('email')
   *   .withContext<AppContext>()
   *   .addJob('sendWelcome', { handler: async () => {} })
   *   .build()
   * ```
   */
  public static create<const TName extends string>(name: TName) {
    return IgniterQueueBuilder.create(name)
  }
}
