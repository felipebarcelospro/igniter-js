/**
 * @fileoverview JSON file-based adapter for IgniterAgent memory storage.
 * This module provides a simple file-based implementation of the memory provider.
 * 
 * @description
 * The IgniterAgentJSONFileAdapter stores all data in JSON files on the local filesystem,
 * making it ideal for:
 * - Development and testing
 * - Single-machine deployments
 * - Offline-first applications
 * - Simple persistence without external databases
 * 
 * **Directory Structure:**
 * ```
 * {dataDir}/
 *   ├── working-memory.json     # All working memory entries
 *   ├── chats.json              # All chat sessions
 *   └── messages/
 *       ├── {chatId}.json       # Messages for specific chat
 *       └── ...
 * ```
 * 
 * @example
 * ```typescript
 * import { IgniterAgentJSONFileAdapter } from '@igniter-js/agents/adapters';
 * 
 * // Create adapter
 * const adapter = new IgniterAgentJSONFileAdapter({
 *   dataDir: './data/agent-memory',
 *   namespace: 'myapp',
 *   autoSync: true
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
 * @module adapters/json-file
 * @packageDocumentation
 */

import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import type {
  IgniterAgentMemoryProvider,
  IgniterAgentWorkingMemory,
  IgniterAgentConversationMessage,
  IgniterAgentChatSession,
  IgniterAgentWorkingMemoryParams,
  IgniterAgentUpdateWorkingMemoryParams,
  IgniterAgentGetMessagesParams,
  IgniterAgentGetChatsParams,
  IgniterAgentMemoryAdapter,
  IgniterAgentAdapterStats,
} from "../types";

/* =============================================================================
 * TYPES
 * ============================================================================= */

/**
 * Options for IgniterAgentJSONFileAdapter.
 * 
 * @public
 */
export interface IgniterAgentJSONFileAdapterOptions {
  /**
   * Directory path where JSON files will be stored.
   * Will be created if it doesn't exist.
   * 
   * @default './igniter-agent-memory'
   */
  dataDir?: string;

  /**
   * Namespace prefix for keys in the JSON files.
   * Allows storing data for multiple apps/instances in the same directory.
   * 
   * @default 'igniter'
   */
  namespace?: string;

  /**
   * Whether to automatically sync changes to disk.
   * If false, call `sync()` manually after modifications.
   * 
   * @default true
   */
  autoSync?: boolean;

  /**
   * Whether to enable debug logging.
   * 
   * @default false
   */
  debug?: boolean;

  /**
   * Maximum number of messages to store per chat.
   * Older messages are removed when limit is exceeded.
   * 
   * @default 1000
   */
  maxMessages?: number;

  /**
   * Maximum number of chat sessions to store.
   * Older chats are removed when limit is exceeded.
   * 
   * @default 100
   */
  maxChats?: number;
}

/* =============================================================================
 * JSON FILE ADAPTER CLASS
 * ============================================================================= */

/**
 * File-based (JSON) implementation of the IgniterAgent memory provider.
 * 
 * @description
 * Stores all memory data in JSON files on the local filesystem. Provides a complete
 * implementation of the memory provider interface for development and testing purposes.
 * 
 * **Features:**
 * - Full implementation of all memory provider methods
 * - Persistent storage across process restarts
 * - Namespace support for multi-tenant applications
 * - Optional automatic file synchronization
 * - Message/chat limits to control storage
 * - Debug logging
 * 
 * **Limitations:**
 * - Not suitable for concurrent access from multiple processes
 * - Performance degrades with large numbers of messages/chats
 * - Not suitable for high-frequency writes
 * 
 * **File Format:**
 * All data is stored in JSON format with ISO 8601 timestamps.
 * 
 * @example
 * ```typescript
 * import { IgniterAgentJSONFileAdapter } from '@igniter-js/agents/adapters';
 * 
 * const adapter = new IgniterAgentJSONFileAdapter({
 *   dataDir: './memory',
 *   namespace: 'myapp',
 *   debug: true
 * });
 * 
 * // Connect to initialize directories
 * await adapter.connect();
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
export class IgniterAgentJSONFileAdapter
  implements IgniterAgentMemoryAdapter<IgniterAgentJSONFileAdapterOptions>
{
  /**
   * The adapter configuration options.
   */
  public readonly options: Required<IgniterAgentJSONFileAdapterOptions>;

  /**
   * Whether the adapter is currently connected and ready to use.
   * @internal
   */
  private _connected: boolean = false;

  /**
   * In-memory cache of working memory entries.
   * @internal
   */
  private _workingMemoryCache: Map<string, IgniterAgentWorkingMemory> =
    new Map();

  /**
   * In-memory cache of messages.
   * @internal
   */
  private _messagesCache: Map<string, IgniterAgentConversationMessage[]> =
    new Map();

  /**
   * In-memory cache of chat sessions.
   * @internal
   */
  private _chatsCache: Map<string, IgniterAgentChatSession> = new Map();

  /**
   * Creates a new IgniterAgentJSONFileAdapter.
   * 
   * @param options - Adapter configuration
   * 
   * @example
   * ```typescript
   * const adapter = new IgniterAgentJSONFileAdapter({
   *   dataDir: './memory',
   *   namespace: 'myapp'
   * });
   * ```
   */
  constructor(options: IgniterAgentJSONFileAdapterOptions = {}) {
    this.options = {
      dataDir: options.dataDir ?? "./igniter-agent-memory",
      namespace: options.namespace ?? "igniter",
      autoSync: options.autoSync ?? true,
      debug: options.debug ?? false,
      maxMessages: options.maxMessages ?? 1000,
      maxChats: options.maxChats ?? 100,
    };
  }

  /**
   * Factory method to create a new adapter instance.
   * @param options - Adapter configuration
   * @returns A new IgniterAgentJSONFileAdapter instance
   *
   * @example
   * ```typescript
   * const adapter = IgniterAgentJSONFileAdapter.create({
   *   dataDir: './data',
   * });
   * ```
   */
  static create(
    options?: IgniterAgentJSONFileAdapterOptions
  ): IgniterAgentJSONFileAdapter {
    return new IgniterAgentJSONFileAdapter(options);
  }

  /* ---------------------------------------------------------------------------
   * PRIVATE HELPER METHODS
   * --------------------------------------------------------------------------- */

  /**
   * Logs debug messages if debug mode is enabled.
   * @internal
   */
  private _log(message: string, data?: unknown): void {
    if (this.options.debug) {
      console.log(`[IgniterAgentJSONFileAdapter] ${message}`, data ?? "");
    }
  }

  /**
   * Gets the path for the working memory JSON file.
   * @internal
   */
  private _getWorkingMemoryPath(): string {
    return join(this.options.dataDir, "working-memory.json");
  }

  /**
   * Gets the path for the chats JSON file.
   * @internal
   */
  private _getChatsPath(): string {
    return join(this.options.dataDir, "chats.json");
  }

  /**
   * Gets the directory for message files.
   * @internal
   */
  private _getMessagesDir(): string {
    return join(this.options.dataDir, "messages");
  }

  /**
   * Gets the path for a specific chat's messages JSON file.
   * @internal
   */
  private _getMessagesPath(chatId: string): string {
    return join(this._getMessagesDir(), `${chatId}.json`);
  }

  /**
   * Generates a cache key with namespace prefix.
   * @internal
   */
  private _key(...parts: string[]): string {
    return [this.options.namespace, ...parts].join(":");
  }

  /**
   * Loads working memory from disk.
   * @internal
   */
  private async _loadWorkingMemory(): Promise<void> {
    try {
      const path = this._getWorkingMemoryPath();
      const content = await readFile(path, "utf-8");
      const data = JSON.parse(content);

      this._workingMemoryCache.clear();
      for (const [key, value] of Object.entries(data)) {
        this._workingMemoryCache.set(key, {
          content: (value as any).content,
          updatedAt: new Date((value as any).updatedAt),
        });
      }
      this._log("Loaded working memory", {
        entries: this._workingMemoryCache.size,
      });
    } catch (err) {
      // File doesn't exist yet, that's ok
      this._log("Working memory file not found, starting fresh");
    }
  }

  /**
   * Loads chats from disk.
   * @internal
   */
  private async _loadChats(): Promise<void> {
    try {
      const path = this._getChatsPath();
      const content = await readFile(path, "utf-8");
      const data = JSON.parse(content);

      this._chatsCache.clear();
      for (const [key, value] of Object.entries(data)) {
        const chat = value as any;
        this._chatsCache.set(key, {
          chatId: chat.chatId,
          userId: chat.userId,
          title: chat.title,
          createdAt: new Date(chat.createdAt),
          updatedAt: new Date(chat.updatedAt),
          messageCount: chat.messageCount,
        });
      }
      this._log("Loaded chats", { entries: this._chatsCache.size });
    } catch (err) {
      this._log("Chats file not found, starting fresh");
    }
  }

  /**
   * Loads a specific chat's messages from disk.
   * @internal
   */
  private async _loadMessages(chatId: string): Promise<void> {
    try {
      const path = this._getMessagesPath(chatId);
      const content = await readFile(path, "utf-8");
      const data = JSON.parse(content);

      const key = this._key("messages", chatId);
      const messages: IgniterAgentConversationMessage[] = data.map(
        (msg: any) => ({
          chatId: msg.chatId,
          userId: msg.userId,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.timestamp),
        })
      );

      this._messagesCache.set(key, messages);
      this._log("Loaded messages", { chatId, count: messages.length });
    } catch (err) {
      this._log("Messages file not found for chat", { chatId });
    }
  }

  /**
   * Saves working memory to disk.
   * @internal
   */
  private async _saveWorkingMemory(): Promise<void> {
    const path = this._getWorkingMemoryPath();
    const data: Record<string, any> = {};

    for (const [key, value] of this._workingMemoryCache.entries()) {
      data[key] = {
        content: value.content,
        updatedAt: value.updatedAt.toISOString(),
      };
    }

    await writeFile(path, JSON.stringify(data, null, 2));
    this._log("Saved working memory");
  }

  /**
   * Saves chats to disk.
   * @internal
   */
  private async _saveChats(): Promise<void> {
    const path = this._getChatsPath();
    const data: Record<string, any> = {};

    for (const [key, value] of this._chatsCache.entries()) {
      data[key] = {
        chatId: value.chatId,
        userId: value.userId,
        title: value.title,
        createdAt: value.createdAt.toISOString(),
        updatedAt: value.updatedAt.toISOString(),
        messageCount: value.messageCount,
      };
    }

    await writeFile(path, JSON.stringify(data, null, 2));
    this._log("Saved chats");
  }

  /**
   * Saves messages for a specific chat to disk.
   * @internal
   */
  private async _saveMessages(chatId: string): Promise<void> {
    const key = this._key("messages", chatId);
    const messages = this._messagesCache.get(key) ?? [];
    const path = this._getMessagesPath(chatId);

    const data = messages.map((msg) => ({
      chatId: msg.chatId,
      userId: msg.userId,
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp.toISOString(),
    }));

    await writeFile(path, JSON.stringify(data, null, 2));
    this._log("Saved messages", { chatId, count: messages.length });
  }

  /* ---------------------------------------------------------------------------
   * LIFECYCLE METHODS
   * --------------------------------------------------------------------------- */

  /**
   * Connects to the storage backend and loads data from disk.
   * 
   * @description
   * Creates necessary directories and loads all data into memory cache.
   * Must be called before using the adapter.
   * 
   * @throws {Error} If directory creation fails
   * 
   * @example
   * ```typescript
   * const adapter = new IgniterAgentJSONFileAdapter();
   * await adapter.connect();
   * ```
   */
  async connect(): Promise<void> {
    try {
      await mkdir(this.options.dataDir, { recursive: true });
      await mkdir(this._getMessagesDir(), { recursive: true });

      await this._loadWorkingMemory();
      await this._loadChats();

      this._connected = true;
      this._log("Connected successfully", {
        dataDir: this.options.dataDir,
      });
    } catch (err) {
      this._log("Connection failed", err);
      throw err;
    }
  }

  /**
   * Disconnects from the storage backend.
   * 
   * @description
   * Syncs any pending changes to disk before disconnecting.
   * 
   * @example
   * ```typescript
   * await adapter.disconnect();
   * ```
   */
  async disconnect(): Promise<void> {
    if (this._connected) {
      await this.sync();
      this._connected = false;
      this._log("Disconnected");
    }
  }

  /**
   * Checks if the adapter is connected and ready to use.
   * 
   * @returns True if connected, false otherwise
   */
  isConnected(): boolean {
    return this._connected;
  }

  /**
   * Manually syncs all in-memory data to disk.
   * 
   * @description
   * Called automatically if autoSync is enabled. Can be called manually
   * to ensure data is persisted to disk.
   * 
   * @example
   * ```typescript
   * await adapter.updateWorkingMemory({ ... });
   * await adapter.sync(); // Ensure written to disk
   * ```
   */
  async sync(): Promise<void> {
    try {
      await this._saveWorkingMemory();
      await this._saveChats();

      // Save all loaded message files
      for (const chatId of this._messagesCache.keys()) {
        const idParts = chatId.split(":");
        if (idParts.length > 0) {
          const actualChatId = idParts[idParts.length - 1];
          await this._saveMessages(actualChatId);
        }
      }

      this._log("Synced all data to disk");
    } catch (err) {
      this._log("Sync failed", err);
      throw err;
    }
  }

  /**
   * Clears all stored data from disk and memory.
   * 
   * @description
   * Removes all working memory, messages, and chat sessions.
   * Use with caution.
   * 
   * @example
   * ```typescript
   * await adapter.clear();
   * ```
   */
  async clear(): Promise<void> {
    this._workingMemoryCache.clear();
    this._messagesCache.clear();
    this._chatsCache.clear();

    if (this.options.autoSync) {
      await this.sync();
    }

    this._log("Cleared all data");
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
   * }
   * ```
   */
  async getWorkingMemory(
    params: IgniterAgentWorkingMemoryParams
  ): Promise<IgniterAgentWorkingMemory | null> {
    const key = this._key("memory", params.scope, params.identifier);
    return this._workingMemoryCache.get(key) ?? null;
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
   *   content: 'User prefers TypeScript'
   * });
   * ```
   */
  async updateWorkingMemory(
    params: IgniterAgentUpdateWorkingMemoryParams
  ): Promise<void> {
    const key = this._key("memory", params.scope, params.identifier);

    this._workingMemoryCache.set(key, {
      content: params.content,
      updatedAt: new Date(),
    });

    if (this.options.autoSync) {
      await this._saveWorkingMemory();
    }
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
    const key = this._key("messages", message.chatId);

    let messages = this._messagesCache.get(key);
    if (!messages) {
      messages = [];
      this._messagesCache.set(key, messages);
    }

    messages.push(message);

    // Enforce max messages limit
    if (messages.length > this.options.maxMessages) {
      messages.splice(0, messages.length - this.options.maxMessages);
    }

    if (this.options.autoSync) {
      await this._saveMessages(message.chatId);
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
    const key = this._key("messages", params.chatId);

    // Load messages if not in cache
    if (!this._messagesCache.has(key)) {
      await this._loadMessages(params.chatId);
    }

    let messages = this._messagesCache.get(key) ?? [];

    // Filter by userId if provided
    if (params.userId) {
      messages = messages.filter((m) => m.userId === params.userId);
    }

    // Apply limit
    if (params.limit && params.limit > 0) {
      messages = messages.slice(-params.limit);
    }

    // Convert to expected format
    return messages.map((m) => ({
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
    const key = this._key("chats", chat.chatId);

    this._chatsCache.set(key, chat);

    // Enforce max chats limit
    if (this._chatsCache.size > this.options.maxChats) {
      const entries = Array.from(this._chatsCache.entries())
        .sort(
          (a, b) =>
            a[1].updatedAt.getTime() - b[1].updatedAt.getTime()
        );

      const toRemove = entries.slice(
        0,
        this._chatsCache.size - this.options.maxChats
      );
      for (const [k] of toRemove) {
        this._chatsCache.delete(k);
      }
    }

    if (this.options.autoSync) {
      await this._saveChats();
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
    let chats = Array.from(this._chatsCache.values());

    // Filter by userId
    if (params.userId) {
      chats = chats.filter((c) => c.userId === params.userId);
    }

    // Filter by search term (title)
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      chats = chats.filter((c) =>
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
   * }
   * ```
   */
  async getChat(chatId: string): Promise<IgniterAgentChatSession | null> {
    const key = this._key("chats", chatId);
    return this._chatsCache.get(key) ?? null;
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
    const key = this._key("chats", chatId);

    const chat = this._chatsCache.get(key);
    if (chat) {
      chat.title = title;
      chat.updatedAt = new Date();

      if (this.options.autoSync) {
        await this._saveChats();
      }
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
    const chatKey = this._key("chats", chatId);
    const messagesKey = this._key("messages", chatId);

    this._chatsCache.delete(chatKey);
    this._messagesCache.delete(messagesKey);

    if (this.options.autoSync) {
      await this._saveChats();
      // Optionally delete the messages file
      try {
        const path = this._getMessagesPath(chatId);
        await readFile(path); // Check if exists
        this._log("Messages file for deleted chat still exists");
      } catch {
        // File doesn't exist, that's fine
      }
    }
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
    for (const messages of this._messagesCache.values()) {
      messageCount += messages.length;
    }

    return {
      workingMemoryCount: this._workingMemoryCache.size,
      messageCount,
      chatCount: this._chatsCache.size,
      timestamp: new Date(),
    };
  }
}
