/**
 * In-Memory Session Store
 * 
 * Simple, ephemeral session storage for development and testing.
 * Sessions are lost when the process restarts.
 * 
 * For production use, consider Redis or Prisma stores.
 */

import type { BotSession, BotSessionStore } from '../types/session'

/**
 * In-memory session store implementation.
 * 
 * Stores sessions in a Map with automatic expiration cleanup.
 */
export class MemorySessionStore implements BotSessionStore {
  private sessions: Map<string, BotSession> = new Map()
  private cleanupInterval?: NodeJS.Timeout

  constructor(options?: {
    /** Interval in ms for cleaning up expired sessions (default: 60000 = 1 minute) */
    cleanupIntervalMs?: number
  }) {
    // Start cleanup interval
    const intervalMs = options?.cleanupIntervalMs ?? 60000
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired()
    }, intervalMs)
  }

  /**
   * Generates a unique key for a session
   */
  private getKey(userId: string, channelId: string): string {
    return `${userId}:${channelId}`
  }

  /**
   * Cleans up expired sessions
   */
  private cleanupExpired(): void {
    const now = new Date()
    const keysToDelete: string[] = []

    for (const [key, session] of this.sessions.entries()) {
      if (session.expiresAt && session.expiresAt < now) {
        keysToDelete.push(key)
      }
    }

    for (const key of keysToDelete) {
      this.sessions.delete(key)
    }
  }

  async get(userId: string, channelId: string): Promise<BotSession | null> {
    const key = this.getKey(userId, channelId)
    const session = this.sessions.get(key)

    if (!session) {
      return null
    }

    // Check if expired
    if (session.expiresAt && session.expiresAt < new Date()) {
      this.sessions.delete(key)
      return null
    }

    return session
  }

  async set(userId: string, channelId: string, session: BotSession): Promise<void> {
    const key = this.getKey(userId, channelId)
    this.sessions.set(key, {
      ...session,
      updatedAt: new Date(),
    })
  }

  async delete(userId: string, channelId: string): Promise<void> {
    const key = this.getKey(userId, channelId)
    this.sessions.delete(key)
  }

  async clear(userId: string): Promise<void> {
    const keysToDelete: string[] = []

    for (const [key, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        keysToDelete.push(key)
      }
    }

    for (const key of keysToDelete) {
      this.sessions.delete(key)
    }
  }

  /**
   * Stops the cleanup interval (call when shutting down)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
  }

  /**
   * Returns the total number of active sessions
   */
  size(): number {
    return this.sessions.size
  }
}

/**
 * Factory function for creating a memory session store
 * 
 * @example
 * ```typescript
 * const bot = IgniterBot
 *   .create()
 *   .withSessionStore(memoryStore())
 *   .build()
 * ```
 */
export function memoryStore(options?: {
  cleanupIntervalMs?: number
}): BotSessionStore {
  return new MemorySessionStore(options)
}

