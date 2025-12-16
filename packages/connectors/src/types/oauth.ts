/**
 * @fileoverview OAuth configuration and data types for IgniterConnector
 * @module @igniter-js/connectors/types/oauth
 */

/**
 * Parsed OAuth token response data.
 * This is the normalized structure returned after exchanging code for tokens.
 *
 * @example
 * ```typescript
 * const tokens: IgniterConnectorOAuthTokens = {
 *   accessToken: 'access_token_value',
 *   refreshToken: 'refresh_token_value',
 *   expiresIn: 3600,
 *   expiresAt: new Date('2024-12-15T00:00:00Z'),
 *   tokenType: 'Bearer',
 * }
 * ```
 */
export interface IgniterConnectorOAuthTokens {
  /** The access token for API requests */
  accessToken: string
  /** The refresh token for obtaining new access tokens (optional) */
  refreshToken?: string
  /** Token expiration time in seconds (optional) */
  expiresIn?: number
  /** Token expiration timestamp (optional) */
  expiresAt?: Date
  /** Token type, typically 'Bearer' (optional) */
  tokenType?: string
}

/**
 * Parsed OAuth user info data.
 * This is the normalized structure returned after fetching user info.
 *
 * @example
 * ```typescript
 * const userInfo: IgniterConnectorOAuthUserInfo = {
 *   id: 'user_123',
 *   name: 'John Doe',
 *   email: 'john@example.com',
 *   avatar: 'https://example.com/avatar.jpg',
 * }
 * ```
 */
export interface IgniterConnectorOAuthUserInfo {
  /** Unique identifier for the user */
  id: string
  /** User's display name (optional) */
  name?: string
  /** User's email address (optional) */
  email?: string
  /** User's avatar URL (optional) */
  avatar?: string
}

/**
 * Complete OAuth data stored in connector config.
 * This combines tokens and account info.
 *
 * @example
 * ```typescript
 * const oauthData: IgniterConnectorOAuthData = {
 *   accessToken: 'access_token_value',
 *   refreshToken: 'refresh_token_value',
 *   expiresIn: 3600,
 *   expiresAt: new Date('2024-12-15T00:00:00Z'),
 *   tokenType: 'Bearer',
 *   userInfo: {
 *     id: 'user_123',
 *     name: 'John Doe',
 *     email: 'john@example.com',
 *   },
 *   connectedAt: new Date(),
 * }
 * ```
 */
export interface IgniterConnectorOAuthData extends IgniterConnectorOAuthTokens {
  /** User information from the OAuth provider */
  userInfo?: IgniterConnectorOAuthUserInfo
  /** Timestamp when the OAuth connection was established */
  connectedAt?: Date
  /**
   * @deprecated Use userInfo instead
   */
  account?: IgniterConnectorOAuthUserInfo
}

/**
 * Context passed to OAuth onConnect handler.
 */
export interface IgniterConnectorOAuthConnectContext {
  /** State parameter for CSRF protection */
  state: string
  /** Requested OAuth scopes */
  scopes: string[]
}

/**
 * Context passed to OAuth onCallback handler.
 */
export interface IgniterConnectorOAuthCallbackContext {
  /** Authorization code from OAuth provider */
  code: string
  /** State parameter for verification */
  state: string
  /** Tokens received from the provider */
  tokens: IgniterConnectorOAuthTokens
}

/**
 * Context passed to OAuth onRefresh handler.
 */
export interface IgniterConnectorOAuthRefreshContext {
  /** The refresh token to use */
  refreshToken: string
  /** The current tokens before refresh */
  currentTokens: IgniterConnectorOAuthTokens
}

/**
 * OAuth configuration options for a connector.
 *
 * @example
 * ```typescript
 * const oauthConfig: IgniterConnectorOAuthOptions = {
 *   authorizationUrl: 'https://provider.com/oauth/authorize',
 *   tokenUrl: 'https://provider.com/oauth/token',
 *   clientId: process.env.CLIENT_ID!,
 *   clientSecret: process.env.CLIENT_SECRET!,
 *   scopes: ['read', 'write'],
 *   userInfoUrl: 'https://provider.com/api/me',
 * }
 * ```
 */
export interface IgniterConnectorOAuthOptions {
  /**
   * The authorization URL for the OAuth provider.
   * User will be redirected here to authorize.
   */
  authorizationUrl: string

  /**
   * The token URL for exchanging code for tokens.
   */
  tokenUrl: string

  /**
   * OAuth client ID.
   */
  clientId: string

  /**
   * OAuth client secret.
   */
  clientSecret: string

  /**
   * OAuth scopes to request.
   * @default []
   */
  scopes?: string[]

  /**
   * OAuth response type.
   * @default 'code'
   */
  responseType?: 'code' | 'token'

  /**
   * OAuth grant type for token exchange.
   * @default 'authorization_code'
   */
  grantType?: string

  /**
   * Method for sending client credentials.
   * - 'client_secret_basic': Use HTTP Basic Auth header
   * - 'client_secret_post': Send in request body
   * @default 'client_secret_post'
   */
  authMethod?: 'client_secret_basic' | 'client_secret_post'

  /**
   * Whether to use PKCE (Proof Key for Code Exchange).
   * @default false
   */
  pkce?: boolean

  /**
   * Whether to generate and validate state parameter.
   * @default true
   */
  state?: boolean

  /**
   * URL to fetch user info after authentication.
   * If provided, user info will be fetched automatically.
   */
  userInfoUrl?: string

  /**
   * Extra query parameters to add to authorization URL.
   *
   * @example
   * ```typescript
   * extraParams: {
   *   prompt: 'consent',
   *   access_type: 'offline',
   * }
   * ```
   */
  extraParams?: Record<string, string>

  /**
   * Custom function to parse the token response.
   * If not provided, common property names will be auto-detected.
   *
   * @example
   * ```typescript
   * parseTokenResponse: (response) => ({
   *   accessToken: response.access_token,
   *   refreshToken: response.refresh_token,
   *   expiresIn: response.expires_in,
   * })
   * ```
   */
  parseTokenResponse?: (
    response: Record<string, unknown>
  ) => IgniterConnectorOAuthTokens

  /**
   * Custom function to parse the user info response.
   * If not provided, common property names will be auto-detected.
   *
   * @example
   * ```typescript
   * parseUserInfo: (response) => ({
   *   id: response.user_id,
   *   name: response.display_name,
   *   email: response.email_address,
   * })
   * ```
   */
  parseUserInfo?: (
    response: Record<string, unknown>
  ) => IgniterConnectorOAuthUserInfo

  /**
   * Custom handler for the OAuth connect flow.
   * Override to customize the authorization URL generation.
   */
  onConnect?: (
    context: IgniterConnectorOAuthConnectContext
  ) => Promise<{ url: string; state: string } | void>

  /**
   * Custom handler for the OAuth callback flow.
   * Override to customize token exchange or add additional logic.
   */
  onCallback?: (
    context: IgniterConnectorOAuthCallbackContext
  ) => Promise<IgniterConnectorOAuthData | void>

  /**
   * Custom handler for token refresh.
   * Override to customize the refresh flow.
   */
  onRefresh?: (
    context: IgniterConnectorOAuthRefreshContext
  ) => Promise<IgniterConnectorOAuthTokens | void>
}

/**
 * Result from initiating OAuth connect flow.
 */
export interface IgniterConnectorOAuthConnectResult {
  /** The authorization URL to redirect the user to */
  url: string
  /** The state parameter for verification in callback */
  state: string
}

/**
 * Parameters for OAuth callback handling.
 */
export interface IgniterConnectorOAuthCallbackParams {
  /** Authorization code from the OAuth provider */
  code?: string
  /** State parameter from the callback URL */
  state?: string
  /** Error code if OAuth failed */
  error?: string
  /** Error description if OAuth failed */
  errorDescription?: string
}

/**
 * Result from OAuth callback handling.
 */
export interface IgniterConnectorOAuthCallbackResult {
  /** Whether the OAuth flow completed successfully */
  success: boolean
  /** The OAuth data (tokens + account info) */
  data?: IgniterConnectorOAuthData
  /** Error message if failed */
  error?: string
}
