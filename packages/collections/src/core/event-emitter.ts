/**
 * @fileoverview Lightweight typed event emitter for internal use.
 * @module @igniter-js/collections/core/event-emitter
 */

import type { IgniterCollectionEventHandler } from "../types/events";

/**
 * Lightweight typed event emitter for internal use.
 *
 * Implements a simple publish/subscribe pattern with TypeScript support
 * for event payloads. Handles both synchronous and asynchronous handlers.
 *
 * @typeParam TEvents - Map of event names to their payload types
 */
export class IgniterCollectionEventEmitter<TEvents extends Record<string, any>> {
  private handlers: Map<keyof TEvents, Set<IgniterCollectionEventHandler>> = new Map();

  /**
   * Subscribe to an event.
   *
   * @param event - Event name to subscribe to
   * @param handler - Function to call when event is emitted
   */
  on<K extends keyof TEvents>(event: K, handler: IgniterCollectionEventHandler<TEvents[K]>): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
  }

  /**
   * Unsubscribe from an event.
   *
   * @param event - Event name to unsubscribe from
   * @param handler - Function to remove from subscribers
   */
  off<K extends keyof TEvents>(event: K, handler: IgniterCollectionEventHandler<TEvents[K]>): void {
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      eventHandlers.delete(handler);
      if (eventHandlers.size === 0) {
        this.handlers.delete(event);
      }
    }
  }

  /**
   * Subscribe to an event once.
   *
   * The handler will be automatically removed after the first emission.
   *
   * @param event - Event name to subscribe to
   * @param handler - Function to call once
   */
  once<K extends keyof TEvents>(event: K, handler: IgniterCollectionEventHandler<TEvents[K]>): void {
    const onceHandler = (data: TEvents[K]) => {
      this.off(event, onceHandler);
      return handler(data);
    };
    this.on(event, onceHandler);
  }

  /**
   * Emit an event to all subscribers.
   *
   * Handlers are executed concurrently and their results are awaited.
   * Errors in handlers are caught and logged, but do not stop other handlers.
   *
   * @param event - Event name to emit
   * @param data - Payload to pass to handlers
   * @returns Promise that resolves when all handlers have completed
   */
  async emit<K extends keyof TEvents>(event: K, data: TEvents[K]): Promise<void> {
    const eventHandlers = this.handlers.get(event);
    if (!eventHandlers) return;

    // Run all handlers
    const promises = Array.from(eventHandlers).map((handler) => {
      try {
        return Promise.resolve(handler(data));
      } catch (error) {
        // Log error but don't stop other handlers
        console.error(
          `[IgniterCollection] Error in event handler for "${String(event)}":`,
          error
        );
        return Promise.resolve();
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Remove all handlers for all events.
   */
  removeAllListeners(): void {
    this.handlers.clear();
  }
}
