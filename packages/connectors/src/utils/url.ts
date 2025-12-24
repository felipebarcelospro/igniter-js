/**
 * @fileoverview URL utilities for IgniterConnector
 * @module @igniter-js/connectors/utils/url
 *
 * @description
 * Provides utilities for detecting and constructing URLs,
 * including automatic base URL detection from environment variables.
 */

/**
 * Environment variable names for base URL detection.
 * Checked in order of priority.
 */
const BASE_URL_ENV_VARS = [
  'IGNITER_BASE_URL',
  'NEXT_PUBLIC_IGNITER_BASE_URL',
  'NEXT_PUBLIC_APP_URL',
  'REACT_APP_BASE_URL',
  'VITE_BASE_URL',
  'BASE_URL',
  'APP_URL',
  'VERCEL_URL',
] as const

const BASE_PATH_ENV_VARS = [
  'IGNITER_BASE_PATH',
  'NEXT_PUBLIC_IGNITER_BASE_PATH',
  'NEXT_PUBLIC_APP_PATH',
  'REACT_APP_BASE_PATH',
  'VITE_BASE_PATH',
  'BASE_PATH',
  'APP_PATH',
] as const

/**
 * Module-level cached base URL to avoid repeated environment lookups.
 */
let cachedBaseUrl: string | undefined

/**
 * Utilities for URL handling in IgniterConnector.
 *
 * @example
 * ```typescript
 * import { IgniterConnectorUrl } from '@igniter-js/connectors'
 *
 * // Get base URL from environment
 * const baseUrl = IgniterConnectorUrl.getBaseUrl()
 *
 * // Build webhook URL
 * const webhookUrl = IgniterConnectorUrl.buildWebhookUrl('telegram', 'secret123')
 * // => 'https://app.example.com/api/v1/connectors/telegram/webhook/secret123'
 *
 * // Build OAuth callback URL
 * const callbackUrl = IgniterConnectorUrl.buildOAuthCallbackUrl('mailchimp')
 * // => 'https://app.example.com/api/v1/connectors/mailchimp/oauth/callback'
 * ```
 */
export class IgniterConnectorUrl {
  /**
   * Get the base URL from environment variables.
   * Checks multiple common environment variable names in order.
   *
   * @param fallback - Optional fallback URL if no environment variable is found
   * @returns The base URL or fallback
   *
   * @example
   * ```typescript
   * // With IGNITER_BASE_URL=https://app.example.com
   * IgniterConnectorUrl.getBaseUrl() // => 'https://app.example.com'
   *
   * // Without environment variables
   * IgniterConnectorUrl.getBaseUrl('http://localhost:3000') // => 'http://localhost:3000'
   * ```
   */
  static getBaseUrl(fallback?: string): string | undefined {
    // Performance: Return cached value if available
    if (cachedBaseUrl) {
      return cachedBaseUrl
    }

    // Loop: Check environment variables in order
    for (const envVar of BASE_URL_ENV_VARS) {
      const value = process.env[envVar]
      if (value) {
        // Data Transform: Remove trailing slash
        cachedBaseUrl = value.replace(/\/$/, '')
        return cachedBaseUrl
      }
    }

    // Fallback: Return fallback or undefined
    return fallback
  }

  /**
   * Clear the cached base URL.
   * Useful for testing or when environment changes.
   */
  static clearCache(): void {
    cachedBaseUrl = undefined
  }

  /**
   * Set the base URL explicitly, overriding environment detection.
   *
   * @param url - The base URL to use
   *
   * @example
   * ```typescript
   * IgniterConnectorUrl.setBaseUrl('https://custom.example.com')
   * ```
   */
  static setBaseUrl(url: string): void {
    // Data Transform: Remove trailing slash
    cachedBaseUrl = url.replace(/\/$/, '')
  }

  /**
   * Get the base path from environment variables.
   * Checks multiple common environment variable names in order.
   *
   * @returns The base path or undefined
   *
   * @example
   * ```typescript
   * // With IGNITER_BASE_PATH=/api/v1
   * IgniterConnectorUrl.getBasePath() // => '//api/v1'
   *
   * // Without environment variables
   * IgniterConnectorUrl.getBasePath() // => undefined
   * ```
   */
  getBasePath(): string | undefined {
    // Loop: Check environment variables in order
    for (const envVar of BASE_PATH_ENV_VARS) {
      const value = process.env[envVar]
      if (value) {
        // Data Transform: Remove trailing slash
        return value.replace(/\/$/, '')
      }
    }

    return undefined
  }

  /**
   * Build the webhook URL for a connector.
   *
   * @param connectorKey - The connector key
   * @param secret - The webhook secret
   * @param baseUrl - Optional base URL override
   * @returns The complete webhook URL
   *
   * @example
   * ```typescript
   * IgniterConnectorUrl.buildWebhookUrl('telegram', 'abc123')
   * // => 'https://app.example.com/api/v1/connectors/telegram/webhook/abc123'
   * ```
   */
  static buildWebhookUrl(
    connectorKey: string,
    secret: string,
    baseUrl?: string
  ): string {
    const base = baseUrl || IgniterConnectorUrl.getBaseUrl()
    if (!base) {
      throw new Error(
        'Base URL not configured. Set IGNITER_BASE_URL environment variable or call IgniterConnectorUrl.setBaseUrl()'
      )
    }

    const basePath = new IgniterConnectorUrl().getBasePath()
    const fullBase = basePath ? `${base}${basePath}` : base
    

    // Response: Build complete webhook URL
    return `${fullBase}/connectors/${connectorKey}/webhook/${secret}`
  }

  /**
   * Build the OAuth callback URL for a connector.
   *
   * @param connectorKey - The connector key
   * @param baseUrl - Optional base URL override
   * @returns The complete OAuth callback URL
   *
   * @example
   * ```typescript
   * IgniterConnectorUrl.buildOAuthCallbackUrl('mailchimp')
   * // => 'https://app.example.com/api/v1/connectors/mailchimp/oauth/callback'
   * ```
   */
  static buildOAuthCallbackUrl(connectorKey: string, baseUrl?: string): string {
    const base = baseUrl || IgniterConnectorUrl.getBaseUrl()
    if (!base) {
      throw new Error(
        'Base URL not configured. Set IGNITER_BASE_URL environment variable or call IgniterConnectorUrl.setBaseUrl()'
      )
    }

    const basePath = new IgniterConnectorUrl().getBasePath()
    const fullBase = basePath ? `${base}${basePath}` : base

    // Response: Build complete OAuth callback URL
    return `${fullBase}/connectors/${connectorKey}/oauth/callback`
  }

  /**
   * Generate a random secret for webhooks.
   *
   * @param length - The length of the secret (default: 32)
   * @returns A random hex string
   *
   * @example
   * ```typescript
   * IgniterConnectorUrl.generateSecret() // => 'a1b2c3d4e5f6...'
   * IgniterConnectorUrl.generateSecret(16) // => 'a1b2c3d4...'
   * ```
   */
  static generateSecret(length = 32): string {
    // Data Transform: Generate random bytes and convert to hex
    const array = new Uint8Array(length / 2)
    crypto.getRandomValues(array)
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join(
      ''
    )
  }

  /**
   * Parse a connector webhook URL to extract connector key and secret.
   *
   * @param url - The webhook URL to parse
   * @returns Object with connectorKey and secret, or null if invalid
   *
   * @example
   * ```typescript
   * IgniterConnectorUrl.parseWebhookUrl('https://app.example.com/api/v1/connectors/telegram/webhook/abc123')
   * // => { connectorKey: 'telegram', secret: 'abc123' }
   * ```
   */
  static parseWebhookUrl(
    url: string
  ): { connectorKey: string; secret: string } | null {
    const pattern =
      /\/api\/v1\/connectors\/([^/]+)\/webhook\/([^/?]+)/
    const match = url.match(pattern)

    if (!match) {
      return null
    }

    // Response: Return parsed values
    return {
      connectorKey: match[1],
      secret: match[2],
    }
  }

  /**
   * Parse a connector OAuth callback URL to extract connector key.
   *
   * @param url - The callback URL to parse
   * @returns Object with connectorKey, or null if invalid
   *
   * @example
   * ```typescript
   * IgniterConnectorUrl.parseOAuthCallbackUrl('https://app.example.com/api/v1/connectors/mailchimp/oauth/callback?code=abc')
   * // => { connectorKey: 'mailchimp' }
   * ```
   */
  static parseOAuthCallbackUrl(
    url: string
  ): { connectorKey: string } | null {
    const pattern = /\/api\/v1\/connectors\/([^/]+)\/oauth\/callback/
    const match = url.match(pattern)

    if (!match) {
      return null
    }

    // Response: Return parsed values
    return {
      connectorKey: match[1],
    }
  }
}
