/**
 * @fileoverview In-memory adapter for IgniterAgent memory storage.
 * This module provides a simple in-memory implementation of the memory provider.
 * 
 * @description
 * The IgniterAgentInMemoryAdapter stores all data in JavaScript Maps,
 * making it ideal for:
 * - Development and testing
 * - Short-lived applications
 * - Prototyping
 * - Demos
 * 
 * **Important:** Data is lost when the process restarts. For production use,
 * consider using a persistent adapter like Redis or PostgreSQL.
 * 
 * @example
 * ```typescript
 * import { IgniterAgentInMemoryAdapter } from '@igniter-js/agents/adapters';
 * 
 * // Create adapter
 * const adapter = new IgniterAgentInMemoryAdapter({
 *   namespace: 'myapp',
 *   debug: true
 * });
 * 
 * // Use with memory config
 * const memoryConfig: IgniterAgentMemoryConfig = {
 *   provider: adapter,
 *   working: { enabled: true, scope: 'chat' },
 *   history: { enabled: true, limit: 100 }
 * };
 * ```
 * 
 * @module adapters/memory
 * @packageDocumentation
 */

import type {
  IgniterAgentMemoryProvider,
  IgniterAgentWorkingMemory,
  IgniterAgentConversationMessage,
  IgniterAgentChatSession,
  IgniterAgentWorkingMemoryParams,
  IgniterAgentUpdateWorkingMemoryParams,
  IgniterAgentGetMessagesParams,
  IgniterAgentGetChatsParams,
  IgniterAgentInMemoryAdapterOptions,
  IgniterAgentMemoryAdapter,
  IgniterAgentAdapterStats,
} from "../types";

/* =============================================================================
 * IN-MEMORY ADAPTER CLASS
 * ============================================================================= */

/**
 * In-memory implementation of the IgniterAgent memory provider.
 * 
 * @description
 * Stores all memory data in JavaScript Maps. Provides a complete implementation
 * of the memory provider interface for development and testing purposes.
 * 
 * **Features:**
 * - Full implementation of all memory provider methods
 * - Optional message/chat limits to control memory usage
 * - Debug logging
 * - Namespace support for multi-tenant applications
 * 
 * **Limitations:**
 * - Data is not persisted across process restarts
 * - Not suitable for production with high availability requirements
 * - No horizontal scaling support
 * 
 * @example
 * ```typescript
 * import { IgniterAgentInMemoryAdapter } from '@igniter-js/agents/adapters';
 * 
 * const adapter = new IgniterAgentInMemoryAdapter({
 *   namespace: 'test',
 *   debug: process.env.NODE_ENV === 'development',
 *   maxMessages: 500,
 *   maxChats: 50
 * });
 * 
 * // Store working memory
 * await adapter.updateWorkingMemory({
 *   scope: 'chat',
 *   identifier: 'chat_123',
 *   content: 'User prefers TypeScript'
 * });
 * 
 * // Retrieve working memory
 * const memory = await adapter.getWorkingMemory({
 *   scope: 'chat',
 *   identifier: 'chat_123'
 * });
 * 
 * console.log(memory?.content); // 'User prefers TypeScript'
 * ```
 * 
 * @public
 */
export class IgniterAgentInMemoryAdapter implements IgniterAgentMemoryAdapter<IgniterAgentInMemoryAdapterOptions> {
  /**
   * The adapter configuration options.
   */
  public readonly options: Required<IgniterAgentInMemoryAdapterOptions>;

  /**
   * Storage for working memory.
   * Key format: `{namespace}:{scope}:{identifier}`
   * @internal
   */
  private readonly _workingMemory: Map<string, IgniterAgentWorkingMemory> = new Map();

  /**
   * Storage for conversation messages.
   * Key format: `{namespace}:{chatId}`
   * @internal
   */
  private readonly _messages: Map<string, IgniterAgentConversationMessage[]> = new Map();

  /**
   * Storage for chat sessions.
   * Key format: `{namespace}:{chatId}`
   * @internal
   */
  private readonly _chats: Map<string, IgniterAgentChatSession> = new Map();

  /**
   * Creates a new IgniterAgentInMemoryAdapter.
   * 
   * @param options - Adapter configuration
   * 
   * @example
   * ```typescript
   * const adapter = new IgniterAgentInMemoryAdapter({
   *   namespace: 'myapp',
   *   maxMessages: 1000,
   *   maxChats: 100
   * });
   * ```
   */
  constructor(options: IgniterAgentInMemoryAdapterOptions = {}) {
    this.options = {
      namespace: options.namespace ?? 'igniter',
      maxMessages: options.maxMessages ?? 1000,
      maxChats: options.maxChats ?? 100,
    };
  }

  /**
   * Factory method to create a new adapter instance.
   * @param options - Adapter configuration
   * @returns A new IgniterAgentInMemoryAdapter instance
   *
   * @example
   * ```typescript
   * const adapter = IgniterAgentInMemoryAdapter.create({
   *   namespace: 'test',
   * });
   * ```
   */
  static create(
    options?: IgniterAgentInMemoryAdapterOptions
  ): IgniterAgentInMemoryAdapter {
    return new IgniterAgentInMemoryAdapter(options);
  }

  /* ---------------------------------------------------------------------------
   * HELPER METHODS
   * --------------------------------------------------------------------------- */

  /**
   * Generates a storage key with namespace prefix.
   * @internal
   */
  private _key(...parts: string[]): string {
    return [this.options.namespace, ...parts].join(':');
  }

  /* ---------------------------------------------------------------------------
   * LIFECYCLE METHODS
   * --------------------------------------------------------------------------- */

  /**
   * Connects to the storage backend (no-op for in-memory).
   * 
   * @description
   * In-memory adapter doesn't require connection setup.
   * This method exists for interface compatibility.
   */
  async connect(): Promise<void> {
    // No-op for in-memory adapter
  }

  /**
   * Disconnects from the storage backend (no-op for in-memory).
   * 
   * @description
   * In-memory adapter doesn't require disconnection.
   * This method exists for interface compatibility.
   */
  async disconnect(): Promise<void> {
    // No-op for in-memory adapter
  }

  /**
   * Checks if the adapter is connected.
   * 
   * @returns Always true for in-memory adapter
   */
  isConnected(): boolean {
    return true;
  }

  /**
   * Clears all stored data.
   * 
   * @description
   * Removes all working memory, messages, and chat sessions.
   * Use with caution.
   * 
   * @example
   * ```typescript
   * // Clear all data (useful for testing)
   * await adapter.clear();
   * ```
   */
  async clear(): Promise<void> {
    this._workingMemory.clear();
    this._messages.clear();
    this._chats.clear();
  }

  /* ---------------------------------------------------------------------------
   * WORKING MEMORY METHODS
   * --------------------------------------------------------------------------- */

  /**
   * Gets working memory for a scope and identifier.
   * 
   * @param params - The scope and identifier
   * @returns The working memory or null if not found
   * 
   * @example
   * ```typescript
   * const memory = await adapter.getWorkingMemory({
   *   scope: 'chat',
   *   identifier: 'chat_123'
   * });
   * 
   * if (memory) {
   *   console.log('Content:', memory.content);
   *   console.log('Updated:', memory.updatedAt);
   * }
   * ```
   */
  async getWorkingMemory(
    params: IgniterAgentWorkingMemoryParams
  ): Promise<IgniterAgentWorkingMemory | null> {
    const key = this._key('memory', params.scope, params.identifier);
    
    return this._workingMemory.get(key) ?? null;
  }

  /**
   * Updates working memory for a scope and identifier.
   * 
   * @param params - The scope, identifier, and new content
   * 
   * @example
   * ```typescript
   * await adapter.updateWorkingMemory({
   *   scope: 'chat',
   *   identifier: 'chat_123',
   *   content: `
   *     ## User Preferences
   *     - Prefers TypeScript
   *     - Uses VS Code
   *   `
   * });
   * ```
   */
  async updateWorkingMemory(
    params: IgniterAgentUpdateWorkingMemoryParams
  ): Promise<void> {
    const key = this._key('memory', params.scope, params.identifier);
    
    this._workingMemory.set(key, {
      content: params.content,
      updatedAt: new Date(),
    });
  }

  /* ---------------------------------------------------------------------------
   * MESSAGE METHODS
   * --------------------------------------------------------------------------- */

  /**
   * Saves a message to the conversation history.
   * 
   * @param message - The message to save
   * 
   * @example
   * ```typescript
   * await adapter.saveMessage({
   *   chatId: 'chat_123',
   *   userId: 'user_456',
   *   role: 'user',
   *   content: 'How do I use TypeScript?',
   *   timestamp: new Date()
   * });
   * ```
   */
  async saveMessage(message: IgniterAgentConversationMessage): Promise<void> {
    const key = this._key('messages', message.chatId);
    
    // Get or create messages array
    let messages = this._messages.get(key);
    if (!messages) {
      messages = [];
      this._messages.set(key, messages);
    }
    
    // Add message
    messages.push(message);
    
    // Enforce max messages limit
    if (messages.length > this.options.maxMessages) {
      messages.splice(0, messages.length - this.options.maxMessages);
    }
  }

  /**
   * Gets messages from the conversation history.
   * 
   * @typeParam T - The message type to return
   * @param params - Query parameters
   * @returns Array of messages
   * 
   * @example
   * ```typescript
   * const messages = await adapter.getMessages({
   *   chatId: 'chat_123',
   *   limit: 50
   * });
   * 
   * for (const msg of messages) {
   *   console.log(`[${msg.role}]: ${msg.content}`);
   * }
   * ```
   */
  async getMessages<T = unknown>(
    params: IgniterAgentGetMessagesParams
  ): Promise<T[]> {
    const key = this._key('messages', params.chatId);
    
    let messages = this._messages.get(key) ?? [];
    
    // Filter by userId if provided
    if (params.userId) {
      messages = messages.filter(m => m.userId === params.userId);
    }
    
    // Apply limit
    if (params.limit && params.limit > 0) {
      messages = messages.slice(-params.limit);
    }
    
    // Convert to expected format (extract content)
    return messages.map(m => ({
      id: `${m.chatId}-${m.timestamp.getTime()}`,
      role: m.role,
      content: m.content,
      createdAt: m.timestamp,
    })) as T[];
  }

  /* ---------------------------------------------------------------------------
   * CHAT SESSION METHODS
   * --------------------------------------------------------------------------- */

  /**
   * Saves or updates a chat session.
   * 
   * @param chat - The chat session to save
   * 
   * @example
   * ```typescript
   * await adapter.saveChat({
   *   chatId: 'chat_123',
   *   userId: 'user_456',
   *   title: 'TypeScript Help',
   *   createdAt: new Date(),
   *   updatedAt: new Date(),
   *   messageCount: 0
   * });
   * ```
   */
  async saveChat(chat: IgniterAgentChatSession): Promise<void> {
    const key = this._key('chats', chat.chatId);
    
    this._chats.set(key, chat);
    
    // Enforce max chats limit
    if (this._chats.size > this.options.maxChats) {
      // Remove oldest chats
      const entries = Array.from(this._chats.entries())
        .sort((a, b) => a[1].updatedAt.getTime() - b[1].updatedAt.getTime());
      
      const toRemove = entries.slice(0, this._chats.size - this.options.maxChats);
      for (const [k] of toRemove) {
        this._chats.delete(k);
      }
    }
  }

  /**
   * Gets chat sessions matching the query parameters.
   * 
   * @param params - Query parameters
   * @returns Array of chat sessions
   * 
   * @example
   * ```typescript
   * const chats = await adapter.getChats({
   *   userId: 'user_456',
   *   search: 'typescript',
   *   limit: 10
   * });
   * 
   * for (const chat of chats) {
   *   console.log(`${chat.title} (${chat.messageCount} messages)`);
   * }
   * ```
   */
  async getChats(
    params: IgniterAgentGetChatsParams
  ): Promise<IgniterAgentChatSession[]> {    
    let chats = Array.from(this._chats.values());
    
    // Filter by userId
    if (params.userId) {
      chats = chats.filter(c => c.userId === params.userId);
    }
    
    // Filter by search term (title)
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      chats = chats.filter(c => 
        c.title?.toLowerCase().includes(searchLower)
      );
    }
    
    // Sort by most recent
    chats.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    
    // Apply limit
    if (params.limit && params.limit > 0) {
      chats = chats.slice(0, params.limit);
    }
    
    return chats;
  }

  /**
   * Gets a specific chat session by ID.
   * 
   * @param chatId - The chat ID
   * @returns The chat session or null if not found
   * 
   * @example
   * ```typescript
   * const chat = await adapter.getChat('chat_123');
   * 
   * if (chat) {
   *   console.log('Title:', chat.title);
   *   console.log('Messages:', chat.messageCount);
   * }
   * ```
   */
  async getChat(chatId: string): Promise<IgniterAgentChatSession | null> {
    const key = this._key('chats', chatId);
    
    return this._chats.get(key) ?? null;
  }

  /**
   * Updates the title of a chat session.
   * 
   * @param chatId - The chat ID
   * @param title - The new title
   * 
   * @example
   * ```typescript
   * await adapter.updateChatTitle('chat_123', 'New Title');
   * ```
   */
  async updateChatTitle(chatId: string, title: string): Promise<void> {
    const key = this._key('chats', chatId);
    
    const chat = this._chats.get(key);
    if (chat) {
      chat.title = title;
      chat.updatedAt = new Date();
    }
  }

  /**
   * Deletes a chat session and its messages.
   * 
   * @param chatId - The chat ID to delete
   * 
   * @example
   * ```typescript
   * await adapter.deleteChat('chat_123');
   * ```
   */
  async deleteChat(chatId: string): Promise<void> {
    const chatKey = this._key('chats', chatId);
    const messagesKey = this._key('messages', chatId);
    
    this._chats.delete(chatKey);
    this._messages.delete(messagesKey);
  }

  /* ---------------------------------------------------------------------------
   * STATS METHODS
   * --------------------------------------------------------------------------- */

  /**
   * Gets storage statistics.
   * 
   * @returns Current storage stats
   * 
   * @example
   * ```typescript
   * const stats = await adapter.getStats();
   * console.log(`Storing ${stats.messageCount} messages`);
   * console.log(`Across ${stats.chatCount} chats`);
   * ```
   */
  async getStats(): Promise<IgniterAgentAdapterStats> {
    let messageCount = 0;
    for (const messages of this._messages.values()) {
      messageCount += messages.length;
    }

    return {
      workingMemoryCount: this._workingMemory.size,
      messageCount,
      chatCount: this._chats.size,
      timestamp: new Date(),
    };
  }
}