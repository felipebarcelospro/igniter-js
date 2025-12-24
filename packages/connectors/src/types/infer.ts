/**
 * @fileoverview $Infer type helper for extracting types from IgniterConnectorManager instances
 * @module @igniter-js/connectors/types/infer
 *
 * @description
 * Provides a type helper that extracts useful types from connector definitions
 * for use in application code without manual type annotations.
 *
 * @example
 * ```typescript
 * import { IgniterConnectorManager, $Infer } from '@igniter-js/connectors'
 *
 * const connectors = IgniterConnectorManager.create()
 *   .addScope('organization', { required: true })
 *   .addConnector('telegram', telegramConnector)
 *   .addConnector('discord', discordConnector)
 *   .build()
 *
 * // Infer types directly from the instance
 * type Connectors = $Infer<typeof connectors>
 *
 * // Use inferred types
 * type ScopeKey = Connectors['ScopeKey'] // 'organization'
 * type ConnectorKey = Connectors['ConnectorKey'] // 'telegram' | 'discord'
 * type TelegramConfig = Connectors['Config']['telegram'] // { botToken: string; chatId: string }
 * type TelegramActions = Connectors['ActionKey']['telegram'] // 'sendMessage' | 'sendPhoto'
 * ```
 */

import type { IgniterConnectorManagerCore } from '../core/manager'
import type { IgniterConnectorScoped } from '../core/scoped'
import type {
  ExtractConnectorConfig,
  ExtractConnectorActions,
  ExtractConnectorActionKeys,
  ExtractActionInput,
  ExtractActionOutput,
} from './connector'

// =============================================================================
// $Infer TYPE HELPER
// =============================================================================

/**
 * Extracts comprehensive type information from an IgniterConnectorManager instance.
 *
 * @typeParam T - The IgniterConnectorManager instance type
 *
 * @example
 * ```typescript
 * const connectors = IgniterConnectorManager.create()
 *   .addScope('organization', { required: true })
 *   .addScope('user', { required: false })
 *   .addConnector('telegram', telegramConnector)
 *   .addConnector('discord', discordConnector)
 *   .build()
 *
 * // Get all inferred types
 * type Types = $Infer<typeof connectors>
 *
 * // Available type properties:
 * type Scopes = Types['ScopeKey']           // 'organization' | 'user'
 * type Connectors = Types['ConnectorKey']  // 'telegram' | 'discord'
 * type TelegramConfig = Types['Config']['telegram']
 * type TelegramActions = Types['ActionKey']['telegram']
 * type SendMessageInput = Types['ActionInput']['telegram']['sendMessage']
 * type SendMessageOutput = Types['ActionOutput']['telegram']['sendMessage']
 * ```
 */
export type $Infer<T> = T extends IgniterConnectorManagerCore<
  infer TScopes,
  infer TConnectors
>
  ? {
      /**
       * Union of all scope keys defined in the connector manager.
       * @example 'organization' | 'user'
       */
      ScopeKey: keyof TScopes & string

      /**
       * Map of scope keys to their definitions.
       * @example { organization: { required: true }, user: { required: false } }
       */
      Scopes: TScopes

      /**
       * Union of all connector keys defined in the connector manager.
       * @example 'telegram' | 'discord'
       */
      ConnectorKey: keyof TConnectors & string

      /**
       * Map of connector keys to their full definitions.
       * Useful for accessing connector metadata, actions, etc.
       */
      Connectors: TConnectors

      /**
       * Map of connector keys to their configuration types.
       * @example { telegram: { botToken: string; chatId: string }, discord: { webhookUrl: string } }
       */
      Config: {
        [K in keyof TConnectors]: ExtractConnectorConfig<TConnectors[K]>
      }

      /**
       * Map of connector keys to their action key unions.
       * @example { telegram: 'sendMessage' | 'sendPhoto', discord: 'sendEvent' }
       */
      ActionKey: {
        [K in keyof TConnectors]: ExtractConnectorActionKeys<TConnectors[K]>
      }

      /**
       * Map of connector keys to their action input types.
       * @example { telegram: { sendMessage: { message: string }, sendPhoto: { photoUrl: string } } }
       */
      ActionInput: {
        [K in keyof TConnectors]: {
          [A in ExtractConnectorActionKeys<TConnectors[K]>]: ExtractConnectorActions<TConnectors[K]> extends infer TActions
            ? TActions extends Record<string, unknown>
              ? A extends keyof TActions
                ? ExtractActionInput<TActions[A]>
                : never
              : never
            : never
        }
      }

      /**
       * Map of connector keys to their action output types.
       * @example { telegram: { sendMessage: { messageId: string }, sendPhoto: { photoId: string } } }
       */
      ActionOutput: {
        [K in keyof TConnectors]: {
          [A in ExtractConnectorActionKeys<TConnectors[K]>]: ExtractConnectorActions<TConnectors[K]> extends infer TActions
            ? TActions extends Record<string, unknown>
              ? A extends keyof TActions
                ? ExtractActionOutput<TActions[A]>
                : never
              : never
            : never
        }
      }

      /**
       * The scoped instance type for this connector manager.
       * Useful for typing function parameters that receive a scoped instance.
       */
      Scoped: IgniterConnectorScoped<TConnectors>
    }
  : never

/**
 * Extracts the scoped instance type from an IgniterConnectorManager.
 * Shorthand for $Infer<T>['Scoped'].
 *
 * @example
 * ```typescript
 * type Scoped = $InferScoped<typeof connectors>
 *
 * async function sendNotification(scoped: Scoped, message: string) {
 *   await scoped.action('telegram', 'sendMessage').call({ message })
 * }
 * ```
 */
export type $InferScoped<T> = T extends IgniterConnectorManagerCore<
  any,
  infer TConnectors
>
  ? IgniterConnectorScoped<TConnectors>
  : never

/**
 * Extracts the connector keys from an IgniterConnectorManager.
 * Shorthand for $Infer<T>['ConnectorKey'].
 *
 * @example
 * ```typescript
 * type ConnectorKey = $InferConnectorKey<typeof connectors> // 'telegram' | 'discord'
 * ```
 */
export type $InferConnectorKey<T> = T extends IgniterConnectorManagerCore<
  any,
  infer TConnectors
>
  ? keyof TConnectors & string
  : never

/**
 * Extracts the scope keys from an IgniterConnectorManager.
 * Shorthand for $Infer<T>['ScopeKey'].
 *
 * @example
 * ```typescript
 * type ScopeKey = $InferScopeKey<typeof connectors> // 'organization' | 'user'
 * ```
 */
export type $InferScopeKey<T> = T extends IgniterConnectorManagerCore<
  infer TScopes,
  any
>
  ? keyof TScopes & string
  : never

/**
 * Extracts the config type for a specific connector.
 *
 * @example
 * ```typescript
 * type TelegramConfig = $InferConfig<typeof connectors, 'telegram'>
 * // { botToken: string; chatId: string }
 * ```
 */
export type $InferConfig<T, K extends string> = T extends IgniterConnectorManagerCore<
  any,
  infer TConnectors
>
  ? K extends keyof TConnectors
    ? ExtractConnectorConfig<TConnectors[K]>
    : never
  : never

/**
 * Extracts the action keys for a specific connector.
 *
 * @example
 * ```typescript
 * type TelegramActions = $InferActionKeys<typeof connectors, 'telegram'>
 * // 'sendMessage' | 'sendPhoto'
 * ```
 */
export type $InferActionKeys<T, K extends string> = T extends IgniterConnectorManagerCore<
  any,
  infer TConnectors
>
  ? K extends keyof TConnectors
    ? ExtractConnectorActionKeys<TConnectors[K]>
    : never
  : never
