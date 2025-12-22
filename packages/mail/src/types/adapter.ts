/**
 * Parameters used by a mail adapter to send an email.
 *
 * @example
 * ```ts
 * await adapter.send({
 *   to: 'user@example.com',
 *   subject: 'Welcome',
 *   html: '<p>Hello</p>',
 *   text: 'Hello',
 * })
 * ```
 */
export interface IgniterMailAdapterSendParams {
  /** Recipient email address. */
  to: string
  /** Email subject. */
  subject: string
  /** HTML body. */
  html: string
  /** Plain-text body. */
  text: string
  /** Optional provider-level scheduled send date. */
  scheduledAt?: Date
}

/**
 * Credentials required by mail adapters.
 *
 * @example
 * ```ts
 * const credentials = { secret: process.env.RESEND_API_KEY, from: 'no-reply@acme.com' }
 * ```
 */
export interface IgniterMailAdapterCredentials {
  /** Provider secret, token, or connection URL. */
  secret?: string
  /** Default FROM address used by the provider. */
  from?: string
}

/**
 * Adapter interface used by {@link IgniterMail}.
 *
 * Adapters will eventually be imported from `@igniter-js/mail/adapters`.
 */
export interface IgniterMailAdapter {
  /**
   * Sends an email using the underlying provider.
   *
   * @param params - Normalized send parameters.
   * @returns A promise that resolves when the provider accepts the email.
   * @throws IgniterMailError When configuration is invalid or provider call fails.
   * @example
   * ```ts
   * await adapter.send({ to: 'a@b.com', subject: 'Hi', html: '<p>x</p>', text: 'x' })
   * ```
   */
  send: (params: IgniterMailAdapterSendParams) => Promise<void>
}
