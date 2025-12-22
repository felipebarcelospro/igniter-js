import { IgniterMailError } from '../errors/mail.error'
import type {
  IgniterMailAdapter,
  IgniterMailAdapterCredentials,
  IgniterMailAdapterSendParams,
} from '../types/adapter'

/**
 * Postmark adapter.
 *
 * Notes:
 * - This implementation uses `fetch` (no SDK dependency).
 * - Designed to be extracted to `@igniter-js/mail/adapters/postmark`.
 *
 * @example
 * ```ts
 * const adapter = PostmarkMailAdapter.create({
 *   secret: process.env.POSTMARK_SERVER_TOKEN,
 *   from: 'no-reply@example.com',
 * })
 * await adapter.send({ to: 'user@example.com', subject: 'Hello', html: '<p>Hi</p>', text: 'Hi' })
 * ```
 */
export class PostmarkMailAdapter implements IgniterMailAdapter {
  /**
   * Creates a new adapter instance.
   *
   * @param credentials - Provider credentials (secret/from).
   * @returns A Postmark adapter instance.
   * @throws {IgniterMailError} Does not throw on creation; errors surface on send.
   * @example
   * ```ts
   * const adapter = PostmarkMailAdapter.create({ secret: 'token', from: 'no-reply@acme.com' })
   * ```
   */
  static create(credentials: IgniterMailAdapterCredentials) {
    return new PostmarkMailAdapter(credentials)
  }

  /**
   * Creates a new adapter instance.
   *
   * @param credentials - Provider credentials (secret/from).
   * @throws {IgniterMailError} Does not throw on creation; errors surface on send.
   */
  constructor(private readonly credentials: IgniterMailAdapterCredentials = {}) {}

  /**
   * Sends an email using Postmark (HTTP API).
   *
   * @param params - Normalized email parameters.
   * @returns A promise that resolves when the email is accepted.
   * @throws {IgniterMailError} When configuration is invalid or Postmark rejects the request.
   * @example
   * ```ts
   * await adapter.send({ to: 'user@example.com', subject: 'Hello', html: '<p>Hi</p>', text: 'Hi' })
   * ```
   */
  async send(params: IgniterMailAdapterSendParams) {
    if (!this.credentials.secret) {
      throw new IgniterMailError({
        code: 'MAIL_ADAPTER_CONFIGURATION_INVALID',
        message: 'Postmark adapter secret is required',
      })
    }

    if (!this.credentials.from) {
      throw new IgniterMailError({
        code: 'MAIL_ADAPTER_CONFIGURATION_INVALID',
        message: 'Postmark adapter from is required',
      })
    }

    const token = this.credentials.secret
    const from = this.credentials.from

    const response = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': token,
      },
      body: JSON.stringify({
        From: from,
        To: params.to,
        Subject: params.subject,
        HtmlBody: params.html,
        TextBody: params.text,
      }),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')

      throw new IgniterMailError({
        code: 'MAIL_PROVIDER_SEND_FAILED',
        message: 'Postmark send failed',
        metadata: {
          status: response.status,
          body,
        },
      })
    }
  }
}