/**
 * @fileoverview OAuth handler for IgniterConnector
 * @module @igniter-js/connectors/core/oauth
 */

import type {
  IgniterConnectorOAuthOptions,
  IgniterConnectorOAuthTokens,
  IgniterConnectorOAuthUserInfo,
  IgniterConnectorOAuthData,
  IgniterConnectorOAuthCallbackParams,
} from '../types/oauth'
import { IgniterConnectorError } from '../errors/connector.error'
import { IgniterConnectorOAuthUtils } from '../utils/oauth'

/**
 * Internal state storage for OAuth flow.
 * Maps state tokens to their associated data.
 */
interface IgniterConnectorOAuthPendingState {
  /** The scope type */
  scope: string
  /** The scope identifier */
  identity: string
  /** The connector key */
  connector: string
  /** PKCE code verifier (if PKCE enabled) */
  codeVerifier?: string
  /** Timestamp of state creation */
  createdAt: Date
  /** Custom data passed by user */
  customData?: Record<string, unknown>
}

/**
 * OAuth handler class for managing OAuth flows.
 * Handles authorization URL generation, token exchange, refresh, and user info fetching.
 *
 * @example
 * ```typescript
 * const oauth = new IgniterConnectorOAuth(options)
 *
 * // Start OAuth flow
 * const { url, state } = await oauth.generateAuthUrl({
 *   scope: 'organization',
 *   identity: 'org_123',
 *   connector: 'mailchimp',
 *   redirectUri: 'https://myapp.com/callback',
 * })
 *
 * // After callback
 * const tokens = await oauth.exchangeCodeForToken(code, state, redirectUri)
 *
 * // Refresh token
 * const newTokens = await oauth.refreshToken(tokens.refreshToken!)
 *
 * // Get user info
 * const userInfo = await oauth.fetchUserInfo(tokens.accessToken)
 * ```
 */
export class IgniterConnectorOAuth {
  /** OAuth configuration options */
  private options: IgniterConnectorOAuthOptions

  /** Pending OAuth states (in-memory, should be replaced with Redis in production) */
  private pendingStates: Map<string, IgniterConnectorOAuthPendingState> =
    new Map()

  /** State expiration time in milliseconds (default: 10 minutes) */
  private stateExpirationMs = 10 * 60 * 1000

  /**
   * Create a new OAuth handler.
   *
   * @param options - OAuth configuration options
   */
  constructor(options: IgniterConnectorOAuthOptions) {
    this.options = options
  }

  /**
   * Get OAuth options.
   *
   * @returns The OAuth configuration options
   */
  getOptions(): IgniterConnectorOAuthOptions {
    return this.options
  }

  /**
   * Generate authorization URL for starting OAuth flow.
   *
   * @param params - Parameters for URL generation
   * @returns Authorization URL and state token
   *
   * @example
   * ```typescript
   * const { url, state, codeVerifier } = await oauth.generateAuthUrl({
   *   scope: 'organization',
   *   identity: 'org_123',
   *   connector: 'mailchimp',
   *   redirectUri: 'https://myapp.com/callback',
   * })
   *
   * // Store codeVerifier if using PKCE
   * // Redirect user to url
   * ```
   */
  async generateAuthUrl(params: {
    scope: string
    identity: string
    connector: string
    redirectUri: string
    customData?: Record<string, unknown>
  }): Promise<{
    url: string
    state: string
    codeVerifier?: string
  }> {
    // Data Transform: Generate state
    const state = IgniterConnectorOAuthUtils.generateState()

    // Data Transform: Generate PKCE if enabled
    let codeVerifier: string | undefined
    let codeChallenge: string | undefined

    if (this.options.pkce) {
      codeVerifier = IgniterConnectorOAuthUtils.generateCodeVerifier()
      codeChallenge =
        await IgniterConnectorOAuthUtils.generateCodeChallenge(codeVerifier)
    }

    // Side Effect: Store pending state
    this.pendingStates.set(state, {
      scope: params.scope,
      identity: params.identity,
      connector: params.connector,
      codeVerifier,
      createdAt: new Date(),
      customData: params.customData,
    })

    // Data Transform: Build URL parameters
    const urlParams: Record<string, string> = {
      client_id: this.options.clientId,
      redirect_uri: params.redirectUri,
      response_type: 'code',
      state,
    }

    // Conditional: Add scopes
    if (this.options.scopes && this.options.scopes.length > 0) {
      urlParams.scope = this.options.scopes.join(' ')
    }

    // Conditional: Add PKCE parameters
    if (codeChallenge) {
      urlParams.code_challenge = codeChallenge
      urlParams.code_challenge_method = 'S256'
    }

    // Conditional: Add extra params
    if (this.options.extraParams) {
      Object.assign(urlParams, this.options.extraParams)
    }

    // Data Transform: Build authorization URL
    const url = IgniterConnectorOAuthUtils.buildAuthUrl(
      this.options.authorizationUrl,
      urlParams
    )

    // Response: Return URL and state
    return {
      url,
      state,
      codeVerifier,
    }
  }

  /**
   * Validate and consume state token.
   *
   * @param state - The state token to validate
   * @returns The pending state data or null if invalid/expired
   *
   * @example
   * ```typescript
   * const pendingState = oauth.validateState(state)
   * if (!pendingState) {
   *   throw new Error('Invalid or expired state')
   * }
   * ```
   */
  validateState(state: string): IgniterConnectorOAuthPendingState | null {
    // Validation: Check if state exists
    const pending = this.pendingStates.get(state)
    if (!pending) {
      return null
    }

    // Validation: Check if state is expired
    const now = Date.now()
    const createdAt = pending.createdAt.getTime()

    if (now - createdAt > this.stateExpirationMs) {
      // Cleanup: Remove expired state
      this.pendingStates.delete(state)
      return null
    }

    // Cleanup: Consume state (one-time use)
    this.pendingStates.delete(state)

    return pending
  }

  /**
   * Exchange authorization code for tokens.
   *
   * @param params - Callback parameters from OAuth provider
   * @param redirectUri - The redirect URI used in authorization
   * @returns OAuth tokens and pending state data
   *
   * @throws {IgniterConnectorError} If state is invalid or token exchange fails
   *
   * @example
   * ```typescript
   * const { tokens, pendingState } = await oauth.exchangeCodeForToken(
   *   { code: 'auth_code', state: 'state_token' },
   *   'https://myapp.com/callback'
   * )
   * ```
   */
  async exchangeCodeForToken(
    params: IgniterConnectorOAuthCallbackParams,
    redirectUri: string
  ): Promise<{
    tokens: IgniterConnectorOAuthTokens
    pendingState: IgniterConnectorOAuthPendingState
  }> {
    // Validation: Check for error in callback
    if (params.error) {
      throw IgniterConnectorError.oauthCallbackError(
        `${params.error}: ${params.errorDescription || 'Unknown error'}`
      )
    }

    // Validation: Code is required
    if (!params.code) {
      throw IgniterConnectorError.oauthCallbackError('Authorization code is missing')
    }

    // Validation: State is required
    if (!params.state) {
      throw IgniterConnectorError.oauthCallbackError('State is missing')
    }

    // Validation: Validate and consume state
    const pendingState = this.validateState(params.state)
    if (!pendingState) {
      throw IgniterConnectorError.oauthStateInvalid()
    }

    // Data Transform: Build token request body
    const body: Record<string, string> = {
      grant_type: 'authorization_code',
      code: params.code,
      client_id: this.options.clientId,
      redirect_uri: redirectUri,
    }

    // Conditional: Add client secret if provided
    if (this.options.clientSecret) {
      body.client_secret = this.options.clientSecret
    }

    // Conditional: Add PKCE verifier
    if (pendingState.codeVerifier) {
      body.code_verifier = pendingState.codeVerifier
    }

    // API Call: Exchange code for tokens
    const response = await fetch(this.options.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(body).toString(),
    })

    // Error Handling: Check response
    if (!response.ok) {
      const errorText = await response.text()
      throw IgniterConnectorError.oauthTokenExchangeFailed(
        `Token exchange failed: ${response.status} - ${errorText}`
      )
    }

    // Data Transform: Parse response
    const rawTokens = (await response.json()) as Record<string, unknown>

    // Data Transform: Parse tokens with auto-detection
    let tokens: IgniterConnectorOAuthTokens | null

    if (this.options.parseTokenResponse) {
      // Conditional: Use custom parser if provided
      tokens = await this.options.parseTokenResponse(rawTokens)
    } else {
      // Fallback: Use auto-detection
      tokens = IgniterConnectorOAuthUtils.parseTokenResponse(rawTokens)
    }

    // Validation: Tokens must be valid
    if (!tokens) {
      throw IgniterConnectorError.oauthParseTokenFailed()
    }

    // Response: Return tokens and state
    return {
      tokens,
      pendingState,
    }
  }

  /**
   * Refresh expired tokens.
   *
   * @param refreshToken - The refresh token
   * @returns New OAuth tokens
   *
   * @throws {IgniterConnectorError} If refresh fails
   *
   * @example
   * ```typescript
   * if (IgniterConnectorOAuthUtils.isExpired(tokens)) {
   *   const newTokens = await oauth.refreshToken(tokens.refreshToken!)
   * }
   * ```
   */
  async refreshToken(
    refreshToken: string
  ): Promise<IgniterConnectorOAuthTokens> {
    // Data Transform: Build refresh request body
    const body: Record<string, string> = {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.options.clientId,
    }

    // Conditional: Add client secret if provided
    if (this.options.clientSecret) {
      body.client_secret = this.options.clientSecret
    }

    // API Call: Refresh tokens
    const response = await fetch(this.options.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(body).toString(),
    })

    // Error Handling: Check response
    if (!response.ok) {
      const errorText = await response.text()
      throw IgniterConnectorError.oauthRefreshFailed(
        `Token refresh failed: ${response.status} - ${errorText}`
      )
    }

    // Data Transform: Parse response
    const rawTokens = (await response.json()) as Record<string, unknown>

    // Data Transform: Parse tokens with auto-detection
    let tokens: IgniterConnectorOAuthTokens | null

    if (this.options.parseTokenResponse) {
      tokens = await this.options.parseTokenResponse(rawTokens)
    } else {
      tokens = IgniterConnectorOAuthUtils.parseTokenResponse(rawTokens)
    }

    // Validation: Tokens must be valid
    if (!tokens) {
      throw IgniterConnectorError.oauthParseTokenFailed()
    }

    // Data Transform: Preserve refresh token if not returned
    if (!tokens.refreshToken) {
      tokens.refreshToken = refreshToken
    }

    return tokens
  }

  /**
   * Fetch user info from OAuth provider.
   *
   * @param accessToken - The access token
   * @returns User info or null if userInfoUrl not configured
   *
   * @throws {IgniterConnectorError} If fetch fails
   *
   * @example
   * ```typescript
   * const userInfo = await oauth.fetchUserInfo(tokens.accessToken)
   * if (userInfo) {
   *   console.log(`Connected as ${userInfo.name}`)
   * }
   * ```
   */
  async fetchUserInfo(
    accessToken: string
  ): Promise<IgniterConnectorOAuthUserInfo | null> {
    // Conditional: No userInfoUrl means no user info
    if (!this.options.userInfoUrl) {
      return null
    }

    // API Call: Fetch user info
    const response = await fetch(this.options.userInfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    // Error Handling: Check response
    if (!response.ok) {
      const errorText = await response.text()
      throw IgniterConnectorError.oauthUserInfoFailed(
        `User info fetch failed: ${response.status} - ${errorText}`
      )
    }

    // Data Transform: Parse response
    const rawUserInfo = (await response.json()) as Record<string, unknown>

    // Data Transform: Parse user info with auto-detection
    if (this.options.parseUserInfo) {
      return this.options.parseUserInfo(rawUserInfo)
    }

    return IgniterConnectorOAuthUtils.parseUserInfo(rawUserInfo)
  }

  /**
   * Complete OAuth data with user info.
   *
   * @param tokens - The OAuth tokens
   * @returns Complete OAuth data including user info
   *
   * @example
   * ```typescript
   * const oauthData = await oauth.completeOAuthData(tokens)
   * // { accessToken: '...', userInfo: { id: '...', name: '...' }, connectedAt: ... }
   * ```
   */
  async completeOAuthData(
    tokens: IgniterConnectorOAuthTokens
  ): Promise<IgniterConnectorOAuthData> {
    // Data Transform: Try to fetch user info
    const userInfo = await this.fetchUserInfo(tokens.accessToken)

    // Response: Build complete OAuth data
    const data: IgniterConnectorOAuthData = {
      accessToken: tokens.accessToken,
      connectedAt: new Date(),
    }

    // Conditional: Add optional fields
    if (tokens.refreshToken) data.refreshToken = tokens.refreshToken
    if (tokens.expiresAt) data.expiresAt = tokens.expiresAt
    if (tokens.expiresIn) data.expiresIn = tokens.expiresIn
    if (tokens.tokenType) data.tokenType = tokens.tokenType
    if (userInfo) data.userInfo = userInfo

    return data
  }

  /**
   * Check if tokens are expired and need refresh.
   *
   * @param tokens - The OAuth tokens to check
   * @param bufferSeconds - Buffer time before expiration (default: 60)
   * @returns True if tokens need refresh
   */
  isExpired(tokens: IgniterConnectorOAuthTokens, bufferSeconds = 60): boolean {
    return IgniterConnectorOAuthUtils.isExpired(tokens, bufferSeconds)
  }

  /**
   * Check if tokens can be refreshed.
   *
   * @param tokens - The OAuth tokens to check
   * @returns True if refresh token is present
   */
  canRefresh(tokens: IgniterConnectorOAuthTokens): boolean {
    return IgniterConnectorOAuthUtils.canRefresh(tokens)
  }

  /**
   * Clean up expired states (call periodically).
   */
  cleanupExpiredStates(): void {
    const now = Date.now()

    // Loop: Remove expired states
    for (const [state, pending] of this.pendingStates) {
      if (now - pending.createdAt.getTime() > this.stateExpirationMs) {
        this.pendingStates.delete(state)
      }
    }
  }
}
