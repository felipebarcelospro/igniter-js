/**
 * @fileoverview Memory-related type definitions for the IgniterAgent library.
 * This module contains all types, interfaces, and configurations for agent memory management.
 * 
 * @description
 * The memory system in IgniterAgent provides:
 * - **Working Memory**: Persistent learned facts and context that agents maintain across conversations
 * - **Conversation History**: Message storage for analytics, retrieval, and cross-session context
 * - **Chat Sessions**: Metadata management for organizing conversations
 * - **Auto-generation**: Automatic title and suggestion generation for enhanced UX
 * 
 * @example
 * ```typescript
 * import { 
 *   IgniterAgentMemoryProvider, 
 *   IgniterAgentMemoryConfig 
 * } from '@igniter-js/agents';
 * 
 * // Implement a custom memory provider
 * const customProvider: IgniterAgentMemoryProvider = {
 *   getWorkingMemory: async ({ scope, identifier }) => {
 *     // Fetch from your database
 *     return { content: '...', updatedAt: new Date() };
 *   },
 *   updateWorkingMemory: async ({ scope, identifier, content }) => {
 *     // Save to your database
 *   }
 * };
 * 
 * // Configure memory for your agent
 * const memoryConfig: IgniterAgentMemoryConfig = {
 *   provider: customProvider,
 *   working: { enabled: true, scope: 'chat' },
 *   history: { enabled: true, limit: 100 },
 *   chats: { enabled: true }
 * };
 * ```
 * 
 * @module types/memory
 * @packageDocumentation
 */

import type { LanguageModel } from "ai";

/* =============================================================================
 * CORE MESSAGE TYPES
 * ============================================================================= */

/**
 * Type alias for UI messages compatible with Vercel AI SDK.
 * 
 * @description
 * This type serves as a placeholder for the UIMessage type from the Vercel AI SDK.
 * Users can override this type when calling `getMessages<T>()` to use their own
 * message type that matches their application's needs.
 * 
 * @remarks
 * The default `any` type allows flexibility when integrating with different
 * frontend frameworks or message formats. For type safety, consider creating
 * your own message interface that matches your UI requirements.
 * 
 * @example
 * ```typescript
 * // Using with default type
 * const messages = await provider.getMessages({ chatId: '123' });
 * 
 * // Using with custom type
 * interface CustomMessage {
 *   id: string;
 *   role: 'user' | 'assistant';
 *   content: string;
 *   timestamp: Date;
 * }
 * const typedMessages = await provider.getMessages<CustomMessage>({ chatId: '123' });
 * ```
 * 
 * @see {@link https://sdk.vercel.ai/docs/reference/ai-sdk-ui/use-chat | Vercel AI SDK useChat}
 * @public
 */
export type IgniterAgentUIMessage = unknown;

/**
 * Defines the role of a message in a conversation.
 * 
 * @description
 * Standard roles used in chat-based AI applications:
 * - `user`: Messages from the human user
 * - `assistant`: Messages from the AI agent
 * - `system`: System-level instructions or context
 * 
 * @public
 */
export type IgniterAgentMessageRole = "user" | "assistant" | "system";

/* =============================================================================
 * MEMORY SCOPE TYPES
 * ============================================================================= */

/**
 * Defines the scope at which memory is stored and retrieved.
 * 
 * @description
 * Memory scope determines the isolation level for stored data:
 * 
 * - **`chat`** (Recommended): Memory is scoped per conversation/chat session.
 *   Each chat has its own isolated memory that doesn't affect other chats.
 *   Best for most use cases where context should be conversation-specific.
 * 
 * - **`user`**: Memory is scoped per user across all their chats.
 *   Useful for storing persistent user preferences or learned facts that
 *   should carry over between different conversations.
 * 
 * @example
 * ```typescript
 * // Chat-scoped memory: Each conversation is independent
 * const chatMemory: IgniterAgentMemoryScope = 'chat';
 * 
 * // User-scoped memory: Shared across all user's conversations
 * const userMemory: IgniterAgentMemoryScope = 'user';
 * ```
 * 
 * @public
 */
export type IgniterAgentMemoryScope = "chat" | "user";

/* =============================================================================
 * WORKING MEMORY TYPES
 * ============================================================================= */

/**
 * Represents persistent working memory that agents maintain.
 * 
 * @description
 * Working memory stores learned facts, preferences, and context that the agent
 * accumulates over time. Unlike conversation history, working memory is a
 * curated, summarized representation of important information.
 * 
 * @property content - The textual content of the working memory
 * @property updatedAt - Timestamp of the last update
 * 
 * @example
 * ```typescript
 * const workingMemory: IgniterAgentWorkingMemory = {
 *   content: `
 *     ## User Preferences
 *     - Prefers TypeScript over JavaScript
 *     - Uses Vim keybindings
 *     - Works on React projects primarily
 *     
 *     ## Project Context
 *     - Current project: E-commerce platform
 *     - Tech stack: Next.js, Prisma, PostgreSQL
 *   `,
 *   updatedAt: new Date('2024-01-15T10:30:00Z')
 * };
 * ```
 * 
 * @see {@link IgniterAgentWorkingMemoryConfig} for configuration options
 * @public
 */
export interface IgniterAgentWorkingMemory {
  /**
   * The textual content of the working memory.
   * 
   * @description
   * This is typically formatted as structured text (e.g., Markdown) containing
   * organized information the agent has learned. The format is flexible and
   * can be customized via the `template` configuration option.
   */
  content: string;

  /**
   * Timestamp of when the working memory was last updated.
   * 
   * @description
   * Used for tracking staleness and implementing cache invalidation strategies.
   */
  updatedAt: Date;
}

/* =============================================================================
 * CONVERSATION MESSAGE TYPES
 * ============================================================================= */

/**
 * Represents a single message in a conversation history.
 * 
 * @description
 * Conversation messages are used for analytics, retrieval-augmented generation (RAG),
 * and cross-session context. This is different from the real-time messages array
 * passed to the agent, which comes directly from the frontend.
 * 
 * @remarks
 * The `content` field can be either a string or a parsed JSON object to support
 * multimodal content (text, images, tool calls, etc.).
 * 
 * @example
 * ```typescript
 * // Simple text message
 * const textMessage: IgniterAgentConversationMessage = {
 *   chatId: 'chat_123',
 *   userId: 'user_456',
 *   role: 'user',
 *   content: 'How do I implement authentication in Next.js?',
 *   timestamp: new Date()
 * };
 * 
 * // Multimodal message with structured content
 * const multimodalMessage: IgniterAgentConversationMessage = {
 *   chatId: 'chat_123',
 *   role: 'assistant',
 *   content: {
 *     type: 'text',
 *     text: 'Here is how to implement authentication...',
 *     toolCalls: [{ name: 'searchDocs', result: '...' }]
 *   },
 *   timestamp: new Date()
 * };
 * ```
 * 
 * @public
 */
export interface IgniterAgentConversationMessage {
  /**
   * Unique identifier for the chat session this message belongs to.
   * 
   * @description
   * Used to group messages by conversation for retrieval and analytics.
   */
  chatId: string;

  /**
   * Optional identifier for the user who sent/received this message.
   * 
   * @description
   * Useful for multi-user applications or when implementing user-scoped
   * memory and analytics.
   */
  userId?: string;

  /**
   * The role of the message sender.
   * 
   * @see {@link IgniterAgentMessageRole}
   */
  role: IgniterAgentMessageRole;

  /**
   * The content of the message.
   * 
   * @description
   * Can be a simple string for text messages, or a complex object
   * for multimodal content including images, tool calls, etc.
   */
  content: string | unknown;

  /**
   * When the message was created.
   * 
   * @description
   * Used for ordering messages and implementing time-based queries.
   */
  timestamp: Date;
}

/* =============================================================================
 * CHAT SESSION TYPES
 * ============================================================================= */

/**
 * Represents metadata for a chat session.
 * 
 * @description
 * Chat sessions provide organizational structure for conversations.
 * They track metadata like titles, timestamps, and message counts
 * without storing the actual message content.
 * 
 * @example
 * ```typescript
 * const session: IgniterAgentChatSession = {
 *   chatId: 'chat_abc123',
 *   userId: 'user_xyz789',
 *   title: 'Next.js Authentication Discussion',
 *   createdAt: new Date('2024-01-15T09:00:00Z'),
 *   updatedAt: new Date('2024-01-15T10:30:00Z'),
 *   messageCount: 24
 * };
 * ```
 * 
 * @public
 */
export interface IgniterAgentChatSession {
  /**
   * Unique identifier for the chat session.
   * 
   * @description
   * This ID is used to reference the chat in all related operations
   * like retrieving messages, updating titles, or deleting the chat.
   */
  chatId: string;

  /**
   * Optional identifier for the user who owns this chat.
   * 
   * @description
   * Used for filtering chats by user and implementing access control.
   */
  userId?: string;

  /**
   * Human-readable title for the chat.
   * 
   * @description
   * Can be automatically generated from the first message or set manually.
   * Used in chat lists and navigation.
   */
  title?: string;

  /**
   * When the chat session was created.
   */
  createdAt: Date;

  /**
   * When the chat session was last updated.
   * 
   * @description
   * Updated whenever a new message is added to the chat.
   */
  updatedAt: Date;

  /**
   * Total number of messages in this chat.
   * 
   * @description
   * Useful for displaying chat statistics without loading all messages.
   */
  messageCount: number;
}

/* =============================================================================
 * GENERATION CONFIG TYPES
 * ============================================================================= */

/**
 * Configuration for automatic chat title generation.
 * 
 * @description
 * When enabled, the system automatically generates descriptive titles
 * for new chat sessions based on the initial conversation content.
 * 
 * @example
 * ```typescript
 * const titleConfig: IgniterAgentGenerateTitleConfig = {
 *   enabled: true,
 *   model: openai('gpt-4'),
 *   instructions: `
 *     Generate a concise, descriptive title (max 50 chars) 
 *     based on the conversation topic.
 *   `
 * };
 * ```
 * 
 * @public
 */
export interface IgniterAgentGenerateTitleConfig {
  /**
   * Whether automatic title generation is enabled.
   * 
   * @defaultValue false
   */
  enabled: boolean;

  /**
   * The language model to use for title generation.
   * 
   * @description
   * If not specified, falls back to the agent's default model.
   * Consider using a smaller, faster model for title generation.
   */
  model?: LanguageModel;

  /**
   * Custom instructions for the title generation prompt.
   * 
   * @description
   * Override the default title generation prompt with custom instructions.
   * Useful for enforcing specific title formats or styles.
   */
  instructions?: string;
}

/**
 * Configuration for automatic prompt suggestions generation.
 * 
 * @description
 * When enabled, the system generates follow-up prompt suggestions
 * after the assistant responds. These suggestions help guide users
 * toward productive next steps in the conversation.
 * 
 * @example
 * ```typescript
 * const suggestionsConfig: IgniterAgentGenerateSuggestionsConfig = {
 *   enabled: true,
 *   model: openai('gpt-3.5-turbo'),
 *   limit: 3,
 *   minResponseLength: 100,
 *   contextWindow: 2,
 *   instructions: `
 *     Generate helpful follow-up questions that dive deeper
 *     into the topic or explore related areas.
 *   `
 * };
 * ```
 * 
 * @public
 */
export interface IgniterAgentGenerateSuggestionsConfig {
  /**
   * Whether automatic suggestion generation is enabled.
   * 
   * @defaultValue false
   */
  enabled: boolean;

  /**
   * The language model to use for suggestion generation.
   * 
   * @description
   * If not specified, falls back to the agent's default model.
   * Consider using a smaller, faster model for suggestions.
   */
  model?: LanguageModel;

  /**
   * Custom instructions for the suggestion generation prompt.
   * 
   * @description
   * Override the default suggestion prompt with custom instructions.
   * Useful for generating domain-specific or styled suggestions.
   */
  instructions?: string;

  /**
   * Maximum number of suggestions to generate.
   * 
   * @description
   * Limits the number of follow-up prompts returned.
   * 
   * @defaultValue 5
   */
  limit?: number;

  /**
   * Minimum assistant response length to trigger suggestion generation.
   * 
   * @description
   * Suggestions are only generated when the assistant's response
   * exceeds this character count. Short responses (like confirmations)
   * typically don't need follow-up suggestions.
   * 
   * @defaultValue 100
   */
  minResponseLength?: number;

  /**
   * Number of recent message exchanges to use as context.
   * 
   * @description
   * Determines how many previous user-assistant exchanges are included
   * when generating suggestions. Higher values provide more context
   * but increase token usage.
   * 
   * @defaultValue 1
   */
  contextWindow?: number;
}

/* =============================================================================
 * MEMORY CONFIGURATION TYPES
 * ============================================================================= */

/**
 * Configuration for working memory features.
 * 
 * @description
 * Controls how the agent manages persistent learned facts and context.
 * 
 * @example
 * ```typescript
 * const workingConfig: IgniterAgentWorkingMemoryConfig = {
 *   enabled: true,
 *   scope: 'chat',
 *   template: `
 *     ## Learned Facts
 *     {{facts}}
 *     
 *     ## User Preferences
 *     {{preferences}}
 *   `
 * };
 * ```
 * 
 * @public
 */
export interface IgniterAgentWorkingMemoryConfig {
  /**
   * Whether working memory is enabled.
   * 
   * @description
   * When enabled, the agent will store and retrieve persistent context.
   */
  enabled: boolean;

  /**
   * The scope at which working memory is stored.
   * 
   * @see {@link IgniterAgentMemoryScope}
   */
  scope: IgniterAgentMemoryScope;

  /**
   * Optional template for formatting working memory content.
   * 
   * @description
   * Defines the structure of how working memory is organized and stored.
   * Supports template variables that can be replaced at runtime.
   */
  template?: string;
}

/**
 * Configuration for conversation history features.
 * 
 * @description
 * Controls how the agent stores and retrieves conversation messages.
 * Note that history storage is separate from the real-time messages
 * passed to the agent from the frontend.
 * 
 * @example
 * ```typescript
 * const historyConfig: IgniterAgentHistoryConfig = {
 *   enabled: true,
 *   limit: 50  // Load last 50 messages for context
 * };
 * ```
 * 
 * @public
 */
export interface IgniterAgentHistoryConfig {
  /**
   * Whether conversation history storage is enabled.
   * 
   * @description
   * When enabled, messages are persisted for analytics and retrieval.
   */
  enabled: boolean;

  /**
   * Maximum number of messages to load from history.
   * 
   * @description
   * Limits how many historical messages are retrieved when building context.
   * Lower values reduce token usage but may lose important context.
   */
  limit?: number;
}

/**
 * Configuration for chat session management features.
 * 
 * @description
 * Controls chat session metadata, title generation, and suggestions.
 * 
 * @example
 * ```typescript
 * const chatsConfig: IgniterAgentChatsConfig = {
 *   enabled: true,
 *   generateTitle: {
 *     enabled: true,
 *     model: openai('gpt-3.5-turbo')
 *   },
 *   generateSuggestions: {
 *     enabled: true,
 *     limit: 3
 *   }
 * };
 * ```
 * 
 * @public
 */
export interface IgniterAgentChatsConfig {
  /**
   * Whether chat session management is enabled.
   */
  enabled: boolean;

  /**
   * Configuration for automatic title generation.
   * 
   * @see {@link IgniterAgentGenerateTitleConfig}
   */
  generateTitle?: IgniterAgentGenerateTitleConfig;

  /**
   * Configuration for automatic suggestion generation.
   * 
   * @see {@link IgniterAgentGenerateSuggestionsConfig}
   */
  generateSuggestions?: IgniterAgentGenerateSuggestionsConfig;
}

/* =============================================================================
 * MEMORY PROVIDER TYPES
 * ============================================================================= */

/**
 * Parameters for working memory operations.
 * 
 * @description
 * Used when getting or updating working memory through the provider.
 * 
 * @typeParam TScope - The memory scope type
 * @typeParam TIdentifier - The identifier type
 * 
 * @public
 */
export interface IgniterAgentWorkingMemoryParams<
  TScope extends string = string,
  TIdentifier extends string = string
> {
  /**
   * The scope at which to access memory.
   * 
   * @see {@link IgniterAgentMemoryScope}
   */
  scope: TScope;

  /**
   * The unique identifier for the memory (e.g., chatId or userId).
   */
  identifier: TIdentifier;
}

/**
 * Parameters for updating working memory.
 * 
 * @typeParam TScope - The memory scope type
 * @typeParam TIdentifier - The identifier type
 * 
 * @public
 */
export interface IgniterAgentUpdateWorkingMemoryParams<
  TScope extends string = string,
  TIdentifier extends string = string
> extends IgniterAgentWorkingMemoryParams<TScope, TIdentifier> {
  /**
   * The new content to store in working memory.
   */
  content: string;
}

/**
 * Parameters for retrieving messages from history.
 * 
 * @public
 */
export interface IgniterAgentGetMessagesParams {
  /**
   * The chat session ID to retrieve messages from.
   */
  chatId: string;

  /**
   * Optional user ID to filter messages.
   */
  userId?: string;

  /**
   * Maximum number of messages to retrieve.
   */
  limit?: number;
}

/**
 * Parameters for retrieving chat sessions.
 * 
 * @public
 */
export interface IgniterAgentGetChatsParams {
  /**
   * Optional user ID to filter chats.
   */
  userId?: string;

  /**
   * Optional search query to filter chats by title.
   */
  search?: string;

  /**
   * Maximum number of chats to retrieve.
   */
  limit?: number;
}

/**
 * Memory Provider Interface for implementing custom storage backends.
 * 
 * @description
 * This interface defines the contract for any storage backend that can be used
 * with the IgniterAgent memory system. Implement this interface to create
 * custom providers for Redis, PostgreSQL, MongoDB, or any other storage solution.
 * 
 * The interface has two required methods for working memory, and several
 * optional methods for extended functionality like conversation history
 * and chat session management.
 * 
 * @typeParam TScope - The memory scope type (defaults to string)
 * @typeParam TIdentifier - The identifier type (defaults to string)
 * 
 * @example
 * ```typescript
 * import { IgniterAgentMemoryProvider } from '@igniter-js/agents';
 * import { Redis } from 'ioredis';
 * 
 * class RedisMemoryProvider implements IgniterAgentMemoryProvider {
 *   private redis: Redis;
 *   
 *   constructor(redis: Redis) {
 *     this.redis = redis;
 *   }
 *   
 *   async getWorkingMemory({ scope, identifier }) {
 *     const key = `memory:${scope}:${identifier}`;
 *     const data = await this.redis.get(key);
 *     if (!data) return null;
 *     
 *     const parsed = JSON.parse(data);
 *     return {
 *       content: parsed.content,
 *       updatedAt: new Date(parsed.updatedAt)
 *     };
 *   }
 *   
 *   async updateWorkingMemory({ scope, identifier, content }) {
 *     const key = `memory:${scope}:${identifier}`;
 *     await this.redis.set(key, JSON.stringify({
 *       content,
 *       updatedAt: new Date().toISOString()
 *     }));
 *   }
 *   
 *   // Implement optional methods as needed...
 * }
 * ```
 * 
 * @see {@link IgniterAgentWorkingMemory} for the working memory structure
 * @see {@link IgniterAgentConversationMessage} for message structure
 * @see {@link IgniterAgentChatSession} for chat session structure
 * 
 * @public
 */
export interface IgniterAgentMemoryProvider<
  TScope extends string = string,
  TIdentifier extends string = string
> {
  /**
   * Retrieves persistent working memory for the given scope and identifier.
   * 
   * @description
   * Fetches the accumulated working memory content. Returns null if no
   * memory exists yet for the given scope/identifier combination.
   * 
   * @param params - The scope and identifier to retrieve memory for
   * @returns The working memory object, or null if not found
   * 
   * @example
   * ```typescript
   * const memory = await provider.getWorkingMemory({
   *   scope: 'chat',
   *   identifier: 'chat_123'
   * });
   * 
   * if (memory) {
   *   console.log('Last updated:', memory.updatedAt);
   *   console.log('Content:', memory.content);
   * }
   * ```
   */
  getWorkingMemory(
    params: IgniterAgentWorkingMemoryParams<TScope, TIdentifier>
  ): Promise<IgniterAgentWorkingMemory | null>;

  /**
   * Updates persistent working memory for the given scope and identifier.
   * 
   * @description
   * Stores or updates the working memory content. This should create
   * a new entry if one doesn't exist, or update the existing entry.
   * 
   * @param params - The scope, identifier, and new content
   * 
   * @example
   * ```typescript
   * await provider.updateWorkingMemory({
   *   scope: 'chat',
   *   identifier: 'chat_123',
   *   content: `
   *     ## Learned Facts
   *     - User prefers TypeScript
   *     - Working on a Next.js project
   *   `
   * });
   * ```
   */
  updateWorkingMemory(
    params: IgniterAgentUpdateWorkingMemoryParams<TScope, TIdentifier>
  ): Promise<void>;

  /**
   * Saves a message to the conversation history.
   * 
   * @description
   * Persists a single conversation message for analytics and retrieval.
   * This is separate from the real-time messages array and is used for
   * long-term storage and cross-session context.
   * 
   * @remarks
   * This method is optional. If not implemented, conversation history
   * features will be unavailable.
   * 
   * @param message - The message to save
   * 
   * @example
   * ```typescript
   * await provider.saveMessage?.({
   *   chatId: 'chat_123',
   *   userId: 'user_456',
   *   role: 'user',
   *   content: 'How do I deploy to Vercel?',
   *   timestamp: new Date()
   * });
   * ```
   */
  saveMessage?(message: IgniterAgentConversationMessage): Promise<void>;

  /**
   * Retrieves recent messages from conversation history.
   * 
   * @description
   * Fetches messages for a given chat, optionally filtered by user
   * and limited to a specific count. Returns messages in UIMessage
   * format compatible with the Vercel AI SDK.
   * 
   * @remarks
   * This method is optional. If not implemented, message retrieval
   * features will be unavailable.
   * 
   * @typeParam T - The message type to return (defaults to UIMessage)
   * @param params - Query parameters for message retrieval
   * @returns Array of messages in the specified format
   * 
   * @example
   * ```typescript
   * // Get last 50 messages
   * const messages = await provider.getMessages?.({
   *   chatId: 'chat_123',
   *   limit: 50
   * });
   * 
   * // Get with custom type
   * interface MyMessage { id: string; text: string; }
   * const typed = await provider.getMessages?.<MyMessage>({ chatId: '123' });
   * ```
   */
  getMessages?<T = IgniterAgentUIMessage>(
    params: IgniterAgentGetMessagesParams
  ): Promise<T[]>;

  /**
   * Saves or updates a chat session.
   * 
   * @description
   * Creates a new chat session or updates an existing one.
   * Used for organizing conversations and tracking metadata.
   * 
   * @remarks
   * This method is optional. If not implemented, chat session
   * management features will be unavailable.
   * 
   * @param chat - The chat session to save
   * 
   * @example
   * ```typescript
   * await provider.saveChat?.({
   *   chatId: 'chat_123',
   *   userId: 'user_456',
   *   title: 'Vercel Deployment Help',
   *   createdAt: new Date(),
   *   updatedAt: new Date(),
   *   messageCount: 1
   * });
   * ```
   */
  saveChat?(chat: IgniterAgentChatSession): Promise<void>;

  /**
   * Retrieves chat sessions for a user.
   * 
   * @description
   * Fetches a list of chat sessions, optionally filtered by user
   * and/or search query. Returns all chats if no userId is provided.
   * 
   * @remarks
   * This method is optional. If not implemented, chat listing
   * features will be unavailable.
   * 
   * @param params - Query parameters for chat retrieval
   * @returns Array of chat sessions matching the criteria
   * 
   * @example
   * ```typescript
   * // Get all chats for a user
   * const userChats = await provider.getChats?.({
   *   userId: 'user_456',
   *   limit: 20
   * });
   * 
   * // Search chats by title
   * const searchResults = await provider.getChats?.({
   *   userId: 'user_456',
   *   search: 'deployment',
   *   limit: 10
   * });
   * ```
   */
  getChats?(params: IgniterAgentGetChatsParams): Promise<IgniterAgentChatSession[]>;

  /**
   * Retrieves a specific chat session by ID.
   * 
   * @description
   * Fetches a single chat session's metadata by its unique identifier.
   * 
   * @remarks
   * This method is optional. If not implemented, single chat retrieval
   * will be unavailable.
   * 
   * @param chatId - The unique chat session ID
   * @returns The chat session, or null if not found
   * 
   * @example
   * ```typescript
   * const chat = await provider.getChat?.('chat_123');
   * if (chat) {
   *   console.log('Title:', chat.title);
   *   console.log('Messages:', chat.messageCount);
   * }
   * ```
   */
  getChat?(chatId: string): Promise<IgniterAgentChatSession | null>;

  /**
   * Updates the title of a chat session.
   * 
   * @description
   * Changes the title of an existing chat session. Useful for
   * user-initiated title changes or auto-generated title updates.
   * 
   * @remarks
   * This method is optional. If not implemented, title updates
   * will be unavailable.
   * 
   * @param chatId - The unique chat session ID
   * @param title - The new title for the chat
   * 
   * @example
   * ```typescript
   * await provider.updateChatTitle?.(
   *   'chat_123',
   *   'Updated: Vercel & AWS Deployment Guide'
   * );
   * ```
   */
  updateChatTitle?(chatId: string, title: string): Promise<void>;

  /**
   * Deletes a chat session and all its associated messages.
   * 
   * @description
   * Permanently removes a chat session and all related data.
   * This operation should be irreversible.
   * 
   * @remarks
   * This method is optional. If not implemented, chat deletion
   * will be unavailable.
   * 
   * @param chatId - The unique chat session ID to delete
   * 
   * @example
   * ```typescript
   * // Delete a chat and all its messages
   * await provider.deleteChat?.('chat_123');
   * ```
   */
  deleteChat?(chatId: string): Promise<void>;
}

/* =============================================================================
 * MAIN MEMORY CONFIG TYPE
 * ============================================================================= */

/**
 * Complete memory configuration for an IgniterAgent.
 * 
 * @description
 * This is the main configuration object for setting up memory features
 * in an agent. It combines provider configuration with feature-specific
 * settings for working memory, history, and chat management.
 * 
 * @example
 * ```typescript
 * import { 
 *   IgniterAgentMemoryConfig,
 *   IgniterAgentMemoryProvider 
 * } from '@igniter-js/agents';
 * 
 * const memoryConfig: IgniterAgentMemoryConfig = {
 *   // Required: Storage provider implementation
 *   provider: myRedisProvider,
 *   
 *   // Optional: Working memory configuration
 *   working: {
 *     enabled: true,
 *     scope: 'chat',
 *     template: '## Context\n{{content}}'
 *   },
 *   
 *   // Optional: Conversation history
 *   history: {
 *     enabled: true,
 *     limit: 100
 *   },
 *   
 *   // Optional: Chat session management
 *   chats: {
 *     enabled: true,
 *     generateTitle: {
 *       enabled: true,
 *       model: openai('gpt-3.5-turbo')
 *     },
 *     generateSuggestions: {
 *       enabled: true,
 *       limit: 3,
 *       minResponseLength: 100
 *     }
 *   }
 * };
 * ```
 * 
 * @see {@link IgniterAgentMemoryProvider} for implementing custom providers
 * @see {@link IgniterAgentWorkingMemoryConfig} for working memory options
 * @see {@link IgniterAgentHistoryConfig} for history options
 * @see {@link IgniterAgentChatsConfig} for chat management options
 * 
 * @public
 */
export interface IgniterAgentMemoryConfig {
  /**
   * The storage provider implementation.
   * 
   * @description
   * Must implement the {@link IgniterAgentMemoryProvider} interface.
   * This is the only required field in the configuration.
   * 
   * @see {@link IgniterAgentMemoryProvider}
   */
  provider: IgniterAgentMemoryProvider;

  /**
   * Configuration for working memory (learned facts).
   * 
   * @description
   * Controls how the agent stores and retrieves persistent context
   * across conversations.
   * 
   * @see {@link IgniterAgentWorkingMemoryConfig}
   */
  working?: IgniterAgentWorkingMemoryConfig;

  /**
   * Configuration for conversation history.
   * 
   * @description
   * Controls message persistence for analytics and retrieval.
   * Note that the agent still receives messages from the frontend;
   * this is for additional persistence and cross-session context.
   * 
   * @see {@link IgniterAgentHistoryConfig}
   */
  history?: IgniterAgentHistoryConfig;

  /**
   * Configuration for chat session management.
   * 
   * @description
   * Controls chat metadata, title generation, and prompt suggestions.
   * 
   * @see {@link IgniterAgentChatsConfig}
   */
  chats?: IgniterAgentChatsConfig;
}

/* =============================================================================
 * RUNTIME MEMORY API
 * ============================================================================= */

/**
 * Runtime interface exposed by IgniterAgent for memory operations.
 *
 * @public
 */
export interface IgniterAgentMemoryRuntime {
  getWorkingMemory(
    params: IgniterAgentWorkingMemoryParams,
  ): Promise<IgniterAgentWorkingMemory | null>;

  updateWorkingMemory(
    params: IgniterAgentUpdateWorkingMemoryParams,
  ): Promise<void>;

  saveMessage(message: IgniterAgentConversationMessage): Promise<void>;

  getMessages<T = IgniterAgentUIMessage>(
    params: IgniterAgentGetMessagesParams,
  ): Promise<T[]>;

  saveChat(chat: IgniterAgentChatSession): Promise<void>;

  getChats(params: IgniterAgentGetChatsParams): Promise<IgniterAgentChatSession[]>;

  getChat(chatId: string): Promise<IgniterAgentChatSession | null>;

  updateChatTitle(chatId: string, title: string): Promise<void>;

  deleteChat(chatId: string): Promise<void>;
}
