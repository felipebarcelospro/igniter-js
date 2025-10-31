/**
 * Bot Session Management Types
 * 
 * Provides interfaces for managing conversational state and user sessions
 * across multiple platforms. Supports pluggable storage backends.
 */

/**
 * Represents a user session in a conversation.
 * Sessions persist state across multiple messages and can expire.
 */
export interface BotSession {
  /** Unique user identifier */
  userId: string
  /** Channel/chat identifier where the session is active */
  channelId: string
  /** Arbitrary session data - store conversation state, form progress, etc */
  data: Record<string, any>
  /** Session creation timestamp */
  createdAt: Date
  /** Last update timestamp */
  updatedAt: Date
  /** Optional expiration timestamp - session auto-deleted after this */
  expiresAt?: Date
}

/**
 * Interface for session storage backends.
 * 
 * Implement this interface to create custom storage adapters
 * (e.g., Redis, Prisma, MongoDB, etc.)
 */
export interface BotSessionStore {
  /**
   * Retrieves a session for a specific user in a specific channel.
   * 
   * @param userId - Unique user identifier
   * @param channelId - Channel/chat identifier
   * @returns Session if exists and not expired, null otherwise
   */
  get(userId: string, channelId: string): Promise<BotSession | null>

  /**
   * Stores or updates a session.
   * 
   * @param userId - Unique user identifier
   * @param channelId - Channel/chat identifier
   * @param session - Session data to store
   */
  set(userId: string, channelId: string, session: BotSession): Promise<void>

  /**
   * Deletes a specific session.
   * 
   * @param userId - Unique user identifier
   * @param channelId - Channel/chat identifier
   */
  delete(userId: string, channelId: string): Promise<void>

  /**
   * Deletes all sessions for a specific user across all channels.
   * 
   * @param userId - Unique user identifier
   */
  clear(userId: string): Promise<void>
}

/**
 * Helper interface for session with convenience methods.
 * Attached to BotContext for easy access in handlers.
 */
export interface BotSessionHelper extends BotSession {
  /**
   * Saves the current session state to the store.
   */
  save(): Promise<void>

  /**
   * Deletes the current session from the store.
   */
  delete(): Promise<void>

  /**
   * Updates session data with partial values.
   * 
   * @param data - Partial data to merge into session.data
   */
  update(data: Partial<Record<string, any>>): Promise<void>
}

