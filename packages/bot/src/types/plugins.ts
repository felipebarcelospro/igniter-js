/**
 * Bot Plugin System Types
 * 
 * Defines interfaces for creating modular, reusable bot extensions.
 * Plugins can register commands, middlewares, adapters, and lifecycle hooks.
 */

import type { BotCommand, Middleware, IBotAdapter, BotContext } from './bot.types'
import type { BotError } from '../bot.provider'

/**
 * Plugin definition for extending bot functionality.
 * 
 * Plugins provide a modular way to package and distribute
 * bot features, middlewares, and integrations.
 */
export interface BotPlugin {
  /** Plugin name (unique identifier) */
  name: string
  /** Plugin version (semver) */
  version: string
  /** Optional plugin description */
  description?: string
  
  /** Commands to register when plugin is loaded */
  commands?: Record<string, BotCommand>
  
  /** Middlewares to add to the pipeline when plugin is loaded */
  middlewares?: Middleware[]
  
  /** Platform adapters provided by the plugin */
  adapters?: Record<string, IBotAdapter<any>>
  
  /** Lifecycle hooks for plugin behavior */
  hooks?: {
    /** Called when bot starts (before adapters init) */
    onStart?: () => Promise<void> | void
    /** Called for every message event */
    onMessage?: (ctx: BotContext) => Promise<void> | void
    /** Called when an error occurs */
    onError?: (ctx: BotContext & { error: BotError }) => Promise<void> | void
    /** Called before bot shuts down (cleanup) */
    onStop?: () => Promise<void> | void
  }
  
  /** Plugin configuration (optional) */
  config?: Record<string, any>
}

/**
 * Plugin factory function signature.
 * Allows plugins to accept configuration at initialization.
 */
export type BotPluginFactory<TConfig = any> = (config?: TConfig) => BotPlugin

/**
 * Plugin registry for tracking loaded plugins.
 * Internal use by Bot instance.
 */
export interface BotPluginRegistry {
  /** Map of plugin name to plugin instance */
  plugins: Map<string, BotPlugin>
  
  /** Register a new plugin */
  register(plugin: BotPlugin): void
  
  /** Get a plugin by name */
  get(name: string): BotPlugin | undefined
  
  /** Check if a plugin is registered */
  has(name: string): boolean
  
  /** Remove a plugin */
  unregister(name: string): void
  
  /** Get all registered plugins */
  getAll(): BotPlugin[]
}

