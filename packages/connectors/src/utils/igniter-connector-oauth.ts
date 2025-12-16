/**
 * @fileoverview OAuth utilities for IgniterConnector
 * @module @igniter-js/connectors/utils/oauth
 */

import type {
  IgniterConnectorOAuthTokens,
  IgniterConnectorOAuthUserInfo,
} from '../types/oauth'

/**
 * Common property names for access token in OAuth responses.
 */
const ACCESS_TOKEN_KEYS = ['access_token', 'accessToken', 'token']

/**
 * Common property names for refresh token in OAuth responses.
 */
const REFRESH_TOKEN_KEYS = ['refresh_token', 'refreshToken']

/**
 * Common property names for expiration in OAuth responses.
 */
const EXPIRES_IN_KEYS = ['expires_in', 'expiresIn', 'expires']

/**
 * Common property names for token type in OAuth responses.
 */
const TOKEN_TYPE_KEYS = ['token_type', 'tokenType']

/**
 * Common property names for user ID in OAuth user info responses.
 */
const USER_ID_KEYS = ['id', 'sub', 'user_id', 'userId', 'uid']

/**
 * Common property names for user name in OAuth user info responses.
 */
const USER_NAME_KEYS = [
  'name',
  'displayName',
  'display_name',
  'username',
  'full_name',
  'fullName',
]

/**
 * Common property names for user email in OAuth user info responses.
 */
const USER_EMAIL_KEYS = ['email', 'emailAddress', 'email_address', 'mail']

/**
 * Common property names for user avatar in OAuth user info responses.
 */
const USER_AVATAR_KEYS = [
  'avatar',
  'picture',
  'avatar_url',
  'avatarUrl',
  'photo',
  'image',
  'profile_image',
  'profileImage',
]

/**
 * Static utility class for OAuth-related operations.
 * Handles auto-detection of token and user info from various OAuth provider responses.
 *
 * @example
 * ```typescript
 * // Auto-detect tokens from OAuth response
 * const tokens = IgniterConnectorOAuthUtils.parseTokenResponse({
 *   access_token: 'abc123',
 *   refresh_token: 'xyz789',
 *   expires_in: 3600,
 * })
 *
 * // Auto-detect user info from API response
 * const userInfo = IgniterConnectorOAuthUtils.parseUserInfo({
 *   sub: 'user_123',
 *   name: 'John Doe',
 *   email: 'john@example.com',
 * })
 * ```
 */
export class IgniterConnectorOAuthUtils {
  /**
   * Find a value in an object using multiple possible keys.
   *
   * @param obj - The object to search
   * @param keys - Array of possible keys to try
   * @returns The found value or undefined
   */
  private static findValue<T>(
    obj: Record<string, unknown>,
    keys: string[]
  ): T | undefined {
    for (const key of keys) {
      if (key in obj && obj[key] !== undefined && obj[key] !== null) {
        return obj[key] as T
      }
    }
    return undefined
  }

  /**
   * Parse OAuth token response with auto-detection.
   * Tries common property names to extract token data.
   *
   * @param response - The raw OAuth token response
   * @returns Parsed token data or null if access token not found
   *
   * @example
   * ```typescript
   * // Standard OAuth response
   * const tokens = IgniterConnectorOAuthUtils.parseTokenResponse({
   *   access_token: 'abc123',
   *   refresh_token: 'xyz789',
   *   expires_in: 3600,
   *   token_type: 'Bearer',
   * })
   * // { accessToken: 'abc123', refreshToken: 'xyz789', expiresIn: 3600, tokenType: 'Bearer' }
   *
   * // Non-standard response (still works)
   * const tokens2 = IgniterConnectorOAuthUtils.parseTokenResponse({
   *   token: 'abc123',
   *   expires: 7200,
   * })
   * // { accessToken: 'abc123', expiresIn: 7200 }
   * ```
   */
  static parseTokenResponse(
    response: Record<string, unknown>
  ): IgniterConnectorOAuthTokens | null {
    // Data Transform: Try to find access token
    const accessToken = IgniterConnectorOAuthUtils.findValue<string>(response, ACCESS_TOKEN_KEYS)

    // Validation: Access token is required
    if (!accessToken) {
      return null
    }

    // Data Transform: Extract optional fields
    const refreshToken = IgniterConnectorOAuthUtils.findValue<string>(response, REFRESH_TOKEN_KEYS)
    const expiresIn = IgniterConnectorOAuthUtils.findValue<number>(response, EXPIRES_IN_KEYS)
    const tokenType = IgniterConnectorOAuthUtils.findValue<string>(response, TOKEN_TYPE_KEYS)

    // Data Transform: Calculate expiresAt if expiresIn is present
    let expiresAt: Date | undefined
    if (expiresIn) {
      expiresAt = new Date(Date.now() + expiresIn * 1000)
    }

    // Response: Build token object
    const tokens: IgniterConnectorOAuthTokens = {
      accessToken,
    }

    // Conditional: Add optional fields if present
    if (refreshToken) tokens.refreshToken = refreshToken
    if (expiresIn) tokens.expiresIn = expiresIn
    if (expiresAt) tokens.expiresAt = expiresAt
    if (tokenType) tokens.tokenType = tokenType

    return tokens
  }

  /**
   * Parse OAuth user info response with auto-detection.
   * Tries common property names to extract user data.
   *
   * @param response - The raw user info response
   * @returns Parsed user info or null if ID not found
   *
   * @example
   * ```typescript
   * // Standard OIDC response
   * const user = IgniterConnectorOAuthUtils.parseUserInfo({
   *   sub: '12345',
   *   name: 'John Doe',
   *   email: 'john@example.com',
   *   picture: 'https://example.com/avatar.jpg',
   * })
   * // { id: '12345', name: 'John Doe', email: 'john@example.com', avatar: '...' }
   *
   * // Custom API response (still works)
   * const user2 = IgniterConnectorOAuthUtils.parseUserInfo({
   *   user_id: 'abc',
   *   display_name: 'Jane',
   *   email_address: 'jane@example.com',
   * })
   * // { id: 'abc', name: 'Jane', email: 'jane@example.com' }
   * ```
   */
  static parseUserInfo(
    response: Record<string, unknown>
  ): IgniterConnectorOAuthUserInfo | null {
    // Data Transform: Try to find user ID
    const id = IgniterConnectorOAuthUtils.findValue<string | number>(response, USER_ID_KEYS)

    // Validation: User ID is required
    if (id === undefined) {
      return null
    }

    // Data Transform: Extract optional fields
    const name = IgniterConnectorOAuthUtils.findValue<string>(response, USER_NAME_KEYS)
    const email = IgniterConnectorOAuthUtils.findValue<string>(response, USER_EMAIL_KEYS)
    const avatar = IgniterConnectorOAuthUtils.findValue<string>(response, USER_AVATAR_KEYS)

    // Response: Build user info object
    const userInfo: IgniterConnectorOAuthUserInfo = {
      id: String(id),
    }

    // Conditional: Add optional fields if present
    if (name) userInfo.name = name
    if (email) userInfo.email = email
    if (avatar) userInfo.avatar = avatar

    return userInfo
  }

  /**
   * Check if OAuth tokens are expired.
   *
   * @param tokens - The OAuth tokens to check
   * @param bufferSeconds - Buffer time before actual expiration (default: 60)
   * @returns True if tokens are expired or will expire soon
   *
   * @example
   * ```typescript
   * const tokens = { accessToken: '...', expiresAt: new Date('2024-12-15') }
   *
   * // Check if expired (with 60 second buffer)
   * if (IgniterConnectorOAuthUtils.isExpired(tokens)) {
   *   // Refresh tokens
   * }
   *
   * // Check with custom buffer (5 minutes)
   * if (IgniterConnectorOAuthUtils.isExpired(tokens, 300)) {
   *   // Refresh tokens
   * }
   * ```
   */
  static isExpired(
    tokens: IgniterConnectorOAuthTokens,
    bufferSeconds = 60
  ): boolean {
    // Conditional: No expiration info means not expired
    if (!tokens.expiresAt && !tokens.expiresIn) {
      return false
    }

    // Data Transform: Calculate expiration time
    let expiresAt: Date

    if (tokens.expiresAt) {
      expiresAt = new Date(tokens.expiresAt)
    } else if (tokens.expiresIn) {
      // Note: This assumes expiresIn is relative to now, which may not be accurate
      // for tokens that were stored. expiresAt is more reliable.
      expiresAt = new Date(Date.now() + tokens.expiresIn * 1000)
    } else {
      return false
    }

    // Data Transform: Add buffer
    const bufferMs = bufferSeconds * 1000
    const now = Date.now()

    // Response: Check if expired
    return expiresAt.getTime() - bufferMs <= now
  }

  /**
   * Check if tokens can be refreshed.
   *
   * @param tokens - The OAuth tokens to check
   * @returns True if refresh token is present
   */
  static canRefresh(tokens: IgniterConnectorOAuthTokens): boolean {
    return !!tokens.refreshToken
  }

  /**
   * Generate a random state parameter for OAuth CSRF protection.
   *
   * @param length - Length of the state string (default: 32)
   * @returns Random state string
   *
   * @example
   * ```typescript
   * const state = IgniterConnectorOAuthUtils.generateState()
   * // 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'
   * ```
   */
  static generateState(length = 32): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''

    // Loop: Generate random characters
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    return result
  }

  /**
   * Generate PKCE code verifier.
   *
   * @param length - Length of the verifier (default: 64)
   * @returns Random code verifier string
   */
  static generateCodeVerifier(length = 64): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
    let result = ''

    // Loop: Generate random characters
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    return result
  }

  /**
   * Generate PKCE code challenge from verifier.
   *
   * @param verifier - The code verifier
   * @returns Base64-URL encoded SHA256 hash
   */
  static async generateCodeChallenge(verifier: string): Promise<string> {
    // Data Transform: Hash the verifier
    const encoder = new TextEncoder()
    const data = encoder.encode(verifier)
    const hash = await crypto.subtle.digest('SHA-256', data)

    // Data Transform: Convert to base64-url
    const base64 = btoa(String.fromCharCode(...new Uint8Array(hash)))
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }

  /**
   * Build authorization URL with query parameters.
   *
   * @param baseUrl - The authorization endpoint URL
   * @param params - Query parameters to add
   * @returns Complete authorization URL
   *
   * @example
   * ```typescript
   * const url = IgniterConnectorOAuthUtils.buildAuthUrl(
   *   'https://provider.com/oauth/authorize',
   *   {
   *     client_id: 'my-client',
   *     redirect_uri: 'https://myapp.com/callback',
   *     response_type: 'code',
   *     scope: 'read write',
   *     state: 'random-state',
   *   }
   * )
   * ```
   */
  static buildAuthUrl(
    baseUrl: string,
    params: Record<string, string>
  ): string {
    const url = new URL(baseUrl)

    // Loop: Add parameters
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, value)
      }
    }

    return url.toString()
  }
}
