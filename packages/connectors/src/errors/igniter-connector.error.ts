/**
 * @fileoverview Error class and error codes for IgniterConnector
 * @module @igniter-js/connectors/errors
 */

import { IgniterError } from '@igniter-js/core'

/**
 * All possible error codes for IgniterConnector.
 * Use these codes for programmatic error handling.
 *
 * @example
 * ```typescript
 * try {
 *   await scoped.telegram.connect(config)
 * } catch (error) {
 *   if (error instanceof IgniterConnectorError) {
 *     switch (error.code) {
 *       case 'CONNECTOR_CONFIG_INVALID':
 *         // Handle invalid config
 *         break
 *       case 'CONNECTOR_ALREADY_CONNECTED':
 *         // Handle already connected
 *         break
 *     }
 *   }
 * }
 * ```
 */
export const IGNITER_CONNECTOR_ERROR_CODES = {
  // Connector errors
  CONNECTOR_NOT_FOUND: 'CONNECTOR_NOT_FOUND',
  CONNECTOR_NOT_CONNECTED: 'CONNECTOR_NOT_CONNECTED',
  CONNECTOR_ALREADY_CONNECTED: 'CONNECTOR_ALREADY_CONNECTED',
  CONNECTOR_CONFIG_INVALID: 'CONNECTOR_CONFIG_INVALID',
  CONNECTOR_DEFAULT_CONFIG_REQUIRED: 'CONNECTOR_DEFAULT_CONFIG_REQUIRED',

  // Action errors
  CONNECTOR_ACTION_NOT_FOUND: 'CONNECTOR_ACTION_NOT_FOUND',
  CONNECTOR_ACTION_INPUT_INVALID: 'CONNECTOR_ACTION_INPUT_INVALID',
  CONNECTOR_ACTION_OUTPUT_INVALID: 'CONNECTOR_ACTION_OUTPUT_INVALID',
  CONNECTOR_ACTION_FAILED: 'CONNECTOR_ACTION_FAILED',

  // Scope errors
  CONNECTOR_SCOPE_INVALID: 'CONNECTOR_SCOPE_INVALID',
  CONNECTOR_SCOPE_IDENTIFIER_REQUIRED: 'CONNECTOR_SCOPE_IDENTIFIER_REQUIRED',

  // Database errors
  CONNECTOR_DATABASE_REQUIRED: 'CONNECTOR_DATABASE_REQUIRED',
  CONNECTOR_DATABASE_FAILED: 'CONNECTOR_DATABASE_FAILED',

  // OAuth errors
  CONNECTOR_OAUTH_NOT_CONFIGURED: 'CONNECTOR_OAUTH_NOT_CONFIGURED',
  CONNECTOR_OAUTH_STATE_INVALID: 'CONNECTOR_OAUTH_STATE_INVALID',
  CONNECTOR_OAUTH_TOKEN_FAILED: 'CONNECTOR_OAUTH_TOKEN_FAILED',
  CONNECTOR_OAUTH_PARSE_TOKEN_FAILED: 'CONNECTOR_OAUTH_PARSE_TOKEN_FAILED',
  CONNECTOR_OAUTH_PARSE_USERINFO_FAILED: 'CONNECTOR_OAUTH_PARSE_USERINFO_FAILED',
  CONNECTOR_OAUTH_REFRESH_FAILED: 'CONNECTOR_OAUTH_REFRESH_FAILED',

  // Webhook errors
  CONNECTOR_WEBHOOK_NOT_CONFIGURED: 'CONNECTOR_WEBHOOK_NOT_CONFIGURED',
  CONNECTOR_WEBHOOK_VALIDATION_FAILED: 'CONNECTOR_WEBHOOK_VALIDATION_FAILED',
  CONNECTOR_WEBHOOK_VERIFICATION_FAILED: 'CONNECTOR_WEBHOOK_VERIFICATION_FAILED',

  // Encryption errors
  CONNECTOR_ENCRYPT_FAILED: 'CONNECTOR_ENCRYPT_FAILED',
  CONNECTOR_DECRYPT_FAILED: 'CONNECTOR_DECRYPT_FAILED',
  CONNECTOR_ENCRYPTION_SECRET_REQUIRED: 'CONNECTOR_ENCRYPTION_SECRET_REQUIRED',

  // Builder errors
  CONNECTOR_BUILD_CONFIG_REQUIRED: 'CONNECTOR_BUILD_CONFIG_REQUIRED',
  CONNECTOR_BUILD_SCOPES_REQUIRED: 'CONNECTOR_BUILD_SCOPES_REQUIRED',
  CONNECTOR_BUILD_CONNECTORS_REQUIRED: 'CONNECTOR_BUILD_CONNECTORS_REQUIRED',
} as const

/**
 * Type representing all possible error codes.
 */
export type IgniterConnectorErrorCode =
  (typeof IGNITER_CONNECTOR_ERROR_CODES)[keyof typeof IGNITER_CONNECTOR_ERROR_CODES]

/**
 * Error metadata for additional context.
 */
export interface IgniterConnectorErrorMetadata {
  /** The connector key involved */
  connector?: string
  /** The action key involved */
  action?: string
  /** The scope type involved */
  scope?: string
  /** The scope identifier involved */
  identity?: string
  /** The operation that failed */
  operation?: string
  /** Validation errors */
  validationErrors?: Array<{ path: string; message: string }>
  /** Additional context data */
  [key: string]: unknown
}

/**
 * Options for creating an IgniterConnectorError.
 */
export interface IgniterConnectorErrorOptions {
  /** The error code */
  code: IgniterConnectorErrorCode
  /** Human-readable error message */
  message: string
  /** HTTP status code (for API responses) */
  statusCode?: number
  /** Additional metadata */
  metadata?: IgniterConnectorErrorMetadata
  /** Original error that caused this error */
  cause?: Error
}

/**
 * Custom error class for IgniterConnector operations.
 * Extends IgniterError from @igniter-js/core.
 *
 * @example
 * ```typescript
 * // Throwing an error
 * throw new IgniterConnectorError({
 *   code: 'CONNECTOR_NOT_FOUND',
 *   message: 'Connector "telegram" is not registered',
 *   metadata: { connector: 'telegram' },
 * })
 *
 * // Catching and handling
 * try {
 *   await scoped.telegram.connect(config)
 * } catch (error) {
 *   if (IgniterConnectorError.isConnectorError(error)) {
 *     console.log(`Error [${error.code}]: ${error.message}`)
 *   }
 * }
 * ```
 */
export class IgniterConnectorError extends IgniterError {
  /**
   * The error code for programmatic handling.
   */
  public readonly code: IgniterConnectorErrorCode

  /**
   * HTTP status code for API responses.
   * @default 500
   */
  public readonly statusCode: number

  /**
   * Additional metadata about the error.
   */
  public readonly metadata: IgniterConnectorErrorMetadata

  /**
   * Creates a new IgniterConnectorError.
   *
   * @param options - Error options
   */
  constructor(options: IgniterConnectorErrorOptions) {
    super({
      code: options.code,
      message: options.message,
      statusCode: options.statusCode ?? 500,
      causer: 'IgniterConnector',
      metadata: options.metadata,
      cause: options.cause,
    })

    this.code = options.code
    this.statusCode = options.statusCode ?? 500
    this.metadata = options.metadata ?? {}

    // Ensure proper prototype chain
    Object.setPrototypeOf(this, IgniterConnectorError.prototype)
  }

  /**
   * Check if an error is an IgniterConnectorError.
   *
   * @param error - The error to check
   * @returns True if the error is an IgniterConnectorError
   *
   * @example
   * ```typescript
   * if (IgniterConnectorError.isConnectorError(error)) {
   *   console.log(error.code)
   * }
   * ```
   */
  static isConnectorError(error: unknown): error is IgniterConnectorError {
    return error instanceof IgniterConnectorError
  }

  /**
   * Create a CONNECTOR_NOT_FOUND error.
   *
   * @param connector - The connector key that was not found
   */
  static notFound(connector: string): IgniterConnectorError {
    return new IgniterConnectorError({
      code: IGNITER_CONNECTOR_ERROR_CODES.CONNECTOR_NOT_FOUND,
      message: `Connector "${connector}" is not registered`,
      statusCode: 404,
      metadata: { connector },
    })
  }

  /**
   * Create a CONNECTOR_NOT_CONNECTED error.
   *
   * @param connector - The connector key
   * @param scope - The scope type
   * @param identity - The scope identifier
   */
  static notConnected(
    connector: string,
    scope: string,
    identity: string
  ): IgniterConnectorError {
    return new IgniterConnectorError({
      code: IGNITER_CONNECTOR_ERROR_CODES.CONNECTOR_NOT_CONNECTED,
      message: `Connector "${connector}" is not connected for ${scope}:${identity}`,
      statusCode: 400,
      metadata: { connector, scope, identity },
    })
  }

  /**
   * Create a CONNECTOR_ALREADY_CONNECTED error.
   *
   * @param connector - The connector key
   * @param scope - The scope type
   * @param identity - The scope identifier
   */
  static alreadyConnected(
    connector: string,
    scope: string,
    identity: string
  ): IgniterConnectorError {
    return new IgniterConnectorError({
      code: IGNITER_CONNECTOR_ERROR_CODES.CONNECTOR_ALREADY_CONNECTED,
      message: `Connector "${connector}" is already connected for ${scope}:${identity}`,
      statusCode: 409,
      metadata: { connector, scope, identity },
    })
  }

  /**
   * Create a CONNECTOR_CONFIG_INVALID error.
   *
   * @param connector - The connector key
   * @param validationErrors - Array of validation errors
   */
  static configInvalid(
    connector: string,
    validationErrors: Array<{ path: string; message: string }>
  ): IgniterConnectorError {
    return new IgniterConnectorError({
      code: IGNITER_CONNECTOR_ERROR_CODES.CONNECTOR_CONFIG_INVALID,
      message: `Invalid configuration for connector "${connector}"`,
      statusCode: 400,
      metadata: { connector, validationErrors },
    })
  }

  /**
   * Create a CONNECTOR_ACTION_NOT_FOUND error.
   *
   * @param connector - The connector key
   * @param action - The action key that was not found
   */
  static actionNotFound(
    connector: string,
    action: string
  ): IgniterConnectorError {
    return new IgniterConnectorError({
      code: IGNITER_CONNECTOR_ERROR_CODES.CONNECTOR_ACTION_NOT_FOUND,
      message: `Action "${action}" not found for connector "${connector}"`,
      statusCode: 404,
      metadata: { connector, action },
    })
  }

  /**
   * Create a CONNECTOR_ACTION_INPUT_INVALID error.
   *
   * @param connector - The connector key
   * @param action - The action key
   * @param validationErrors - Array of validation errors
   */
  static actionInputInvalid(
    connector: string,
    action: string,
    validationErrors: Array<{ path: string; message: string }>
  ): IgniterConnectorError {
    return new IgniterConnectorError({
      code: IGNITER_CONNECTOR_ERROR_CODES.CONNECTOR_ACTION_INPUT_INVALID,
      message: `Invalid input for action "${action}" of connector "${connector}"`,
      statusCode: 400,
      metadata: { connector, action, validationErrors },
    })
  }

  /**
   * Create a CONNECTOR_SCOPE_INVALID error.
   *
   * @param scope - The invalid scope key
   */
  static scopeInvalid(scope: string): IgniterConnectorError {
    return new IgniterConnectorError({
      code: IGNITER_CONNECTOR_ERROR_CODES.CONNECTOR_SCOPE_INVALID,
      message: `Scope "${scope}" is not registered`,
      statusCode: 400,
      metadata: { scope },
    })
  }

  /**
   * Create a CONNECTOR_SCOPE_IDENTIFIER_REQUIRED error.
   *
   * @param scope - The scope key
   */
  static scopeIdentifierRequired(scope: string): IgniterConnectorError {
    return new IgniterConnectorError({
      code: IGNITER_CONNECTOR_ERROR_CODES.CONNECTOR_SCOPE_IDENTIFIER_REQUIRED,
      message: `Scope "${scope}" requires an identifier`,
      statusCode: 400,
      metadata: { scope },
    })
  }

  /**
   * Alias for scopeInvalid for use in connector code.
   *
   * @param scope - The invalid scope key
   */
  static scopeNotDefined(scope: string): IgniterConnectorError {
    return IgniterConnectorError.scopeInvalid(scope)
  }

  /**
   * Alias for scopeIdentifierRequired for use in connector code.
   *
   * @param scope - The scope key
   */
  static scopeIdentityRequired(scope: string): IgniterConnectorError {
    return IgniterConnectorError.scopeIdentifierRequired(scope)
  }

  /**
   * Alias for notFound for use in connector code.
   *
   * @param connector - The connector key
   */
  static connectorNotFound(connector: string): IgniterConnectorError {
    return IgniterConnectorError.notFound(connector)
  }

  /**
   * Alias for notConnected for use in connector code.
   *
   * @param connector - The connector key
   */
  static connectorNotConnected(connector: string): IgniterConnectorError {
    return new IgniterConnectorError({
      code: IGNITER_CONNECTOR_ERROR_CODES.CONNECTOR_NOT_CONNECTED,
      message: `Connector "${connector}" is not connected`,
      statusCode: 400,
      metadata: { connector },
    })
  }

  /**
   * Create a connector disabled error.
   *
   * @param connector - The connector key
   */
  static connectorDisabled(connector: string): IgniterConnectorError {
    return new IgniterConnectorError({
      code: IGNITER_CONNECTOR_ERROR_CODES.CONNECTOR_NOT_CONNECTED,
      message: `Connector "${connector}" is disabled`,
      statusCode: 400,
      metadata: { connector },
    })
  }

  /**
   * Create a validation failed error.
   *
   * @param connector - The connector key
   * @param message - The error message
   */
  static validationFailed(
    connector: string,
    message: string
  ): IgniterConnectorError {
    return new IgniterConnectorError({
      code: IGNITER_CONNECTOR_ERROR_CODES.CONNECTOR_CONFIG_INVALID,
      message: `Validation failed for "${connector}": ${message}`,
      statusCode: 400,
      metadata: { connector },
    })
  }

  /**
   * Create an OAuth token expired error.
   *
   * @param connector - The connector key
   */
  static oauthTokenExpired(connector: string): IgniterConnectorError {
    return new IgniterConnectorError({
      code: IGNITER_CONNECTOR_ERROR_CODES.CONNECTOR_OAUTH_REFRESH_FAILED,
      message: `OAuth token expired for connector "${connector}" and cannot be refreshed`,
      statusCode: 401,
      metadata: { connector },
    })
  }

  /**
   * Create a webhook not configured error.
   *
   * @param connector - The connector key
   */
  static webhookNotConfigured(connector: string): IgniterConnectorError {
    return new IgniterConnectorError({
      code: IGNITER_CONNECTOR_ERROR_CODES.CONNECTOR_WEBHOOK_NOT_CONFIGURED,
      message: `Webhook is not configured for connector "${connector}"`,
      statusCode: 400,
      metadata: { connector },
    })
  }

  /**
   * Create a webhook verification failed error.
   *
   * @param connector - The connector key
   */
  static webhookVerificationFailed(connector: string): IgniterConnectorError {
    return new IgniterConnectorError({
      code: IGNITER_CONNECTOR_ERROR_CODES.CONNECTOR_WEBHOOK_VERIFICATION_FAILED,
      message: `Webhook verification failed for connector "${connector}"`,
      statusCode: 401,
      metadata: { connector },
    })
  }

  /**
   * Create a CONNECTOR_DATABASE_REQUIRED error.
   *
   * @param operation - The operation that requires a database
   */
  static databaseRequired(operation: string): IgniterConnectorError {
    return new IgniterConnectorError({
      code: IGNITER_CONNECTOR_ERROR_CODES.CONNECTOR_DATABASE_REQUIRED,
      message: `Database adapter is required for operation "${operation}"`,
      statusCode: 500,
      metadata: { operation },
    })
  }

  /**
   * Create a CONNECTOR_OAUTH_NOT_CONFIGURED error.
   *
   * @param connector - The connector key
   */
  static oauthNotConfigured(connector: string): IgniterConnectorError {
    return new IgniterConnectorError({
      code: IGNITER_CONNECTOR_ERROR_CODES.CONNECTOR_OAUTH_NOT_CONFIGURED,
      message: `OAuth is not configured for connector "${connector}"`,
      statusCode: 400,
      metadata: { connector },
    })
  }

  /**
   * Create a CONNECTOR_OAUTH_PARSE_TOKEN_FAILED error.
   *
   * @param connector - The connector key (optional)
   */
  static oauthParseTokenFailed(connector?: string): IgniterConnectorError {
    const message = connector
      ? `Failed to parse OAuth token response for connector "${connector}". Please provide a custom parseTokenResponse function.`
      : 'Failed to parse OAuth token response. Please provide a custom parseTokenResponse function.'
    return new IgniterConnectorError({
      code: IGNITER_CONNECTOR_ERROR_CODES.CONNECTOR_OAUTH_PARSE_TOKEN_FAILED,
      message,
      statusCode: 500,
      metadata: connector ? { connector } : undefined,
    })
  }

  /**
   * Create a CONNECTOR_OAUTH_PARSE_USERINFO_FAILED error.
   *
   * @param connector - The connector key
   */
  static oauthParseUserInfoFailed(connector: string): IgniterConnectorError {
    return new IgniterConnectorError({
      code: IGNITER_CONNECTOR_ERROR_CODES.CONNECTOR_OAUTH_PARSE_USERINFO_FAILED,
      message: `Failed to parse OAuth user info for connector "${connector}". Please provide a custom parseUserInfo function.`,
      statusCode: 500,
      metadata: { connector },
    })
  }

  /**
   * Create an OAuth callback error.
   *
   * @param message - The error message
   */
  static oauthCallbackError(message: string): IgniterConnectorError {
    return new IgniterConnectorError({
      code: IGNITER_CONNECTOR_ERROR_CODES.CONNECTOR_OAUTH_NOT_CONFIGURED,
      message: `OAuth callback error: ${message}`,
      statusCode: 400,
    })
  }

  /**
   * Create an OAuth state invalid error.
   */
  static oauthStateInvalid(): IgniterConnectorError {
    return new IgniterConnectorError({
      code: IGNITER_CONNECTOR_ERROR_CODES.CONNECTOR_OAUTH_NOT_CONFIGURED,
      message: 'OAuth state is invalid or expired. Please try again.',
      statusCode: 400,
    })
  }

  /**
   * Create an OAuth token exchange failed error.
   *
   * @param message - The error message
   */
  static oauthTokenExchangeFailed(message: string): IgniterConnectorError {
    return new IgniterConnectorError({
      code: IGNITER_CONNECTOR_ERROR_CODES.CONNECTOR_OAUTH_PARSE_TOKEN_FAILED,
      message,
      statusCode: 500,
    })
  }

  /**
   * Create an OAuth refresh failed error.
   *
   * @param message - The error message
   */
  static oauthRefreshFailed(message: string): IgniterConnectorError {
    return new IgniterConnectorError({
      code: IGNITER_CONNECTOR_ERROR_CODES.CONNECTOR_OAUTH_PARSE_TOKEN_FAILED,
      message,
      statusCode: 500,
    })
  }

  /**
   * Create an OAuth user info fetch failed error.
   *
   * @param message - The error message
   */
  static oauthUserInfoFailed(message: string): IgniterConnectorError {
    return new IgniterConnectorError({
      code: IGNITER_CONNECTOR_ERROR_CODES.CONNECTOR_OAUTH_PARSE_USERINFO_FAILED,
      message,
      statusCode: 500,
    })
  }

  /**
   * Create a CONNECTOR_ENCRYPTION_SECRET_REQUIRED error.
   */
  static encryptionSecretRequired(): IgniterConnectorError {
    return new IgniterConnectorError({
      code: IGNITER_CONNECTOR_ERROR_CODES.CONNECTOR_ENCRYPTION_SECRET_REQUIRED,
      message:
        'IGNITER_SECRET environment variable is required for encryption. Set it or provide a custom encryption callback.',
      statusCode: 500,
    })
  }

  /**
   * Create a CONNECTOR_DEFAULT_CONFIG_REQUIRED error.
   * Used when trying to use action() without a scoped instance and no defaultConfig is set.
   *
   * @param connector - The connector key
   */
  static configRequired(connector: string): IgniterConnectorError {
    return new IgniterConnectorError({
      code: IGNITER_CONNECTOR_ERROR_CODES.CONNECTOR_DEFAULT_CONFIG_REQUIRED,
      message: `Connector "${connector}" requires defaultConfig to execute actions without a scoped instance. Use .scope() first or set defaultConfig in the connector definition.`,
      statusCode: 400,
      metadata: { connector },
    })
  }

  /**
   * Convert error to JSON for API responses.
   */
  toJSON(): Record<string, unknown> {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      metadata: this.metadata,
    }
  }
}
