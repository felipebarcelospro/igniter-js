import { IgniterMailError } from '../errors/mail.error'
import type {
  IgniterMailAdapter,
  IgniterMailAdapterCredentials,
  IgniterMailAdapterSendParams,
} from '../types/adapter'

/**
 * SendGrid adapter implementation.
 *
 * Notes:
 * - This implementation uses `fetch` (no SDK dependency).
 * - Designed to be extracted to `@igniter-js/mail/adapters/sendgrid`.
 *
 * @example
 * ```ts
 * const adapter = SendGridMailAdapter.create({
 *   secret: process.env.SENDGRID_API_KEY,
 *   from: 'no-reply@example.com',
 * })
 * await adapter.send({ to: 'user@example.com', subject: 'Hello', html: '<p>Hi</p>', text: 'Hi' })
 * ```
 */
export class SendGridMailAdapter implements IgniterMailAdapter {
  /**
   * Creates a new adapter instance.
   *
   * @param credentials - Adapter credentials including API secret and default from.
   * @returns A configured SendGrid adapter.
   * @throws {IgniterMailError} Does not throw on creation; errors surface on send.
   * @example
   * ```ts
   * const adapter = SendGridMailAdapter.create({ secret: 'token', from: 'no-reply@acme.com' })
   * ```
   */
  static create(credentials: IgniterMailAdapterCredentials) {
    return new SendGridMailAdapter(credentials)
  }

  /**
   * Creates an adapter with credentials.
   *
   * @param credentials - Adapter credentials including API secret and default from.
   * @throws {IgniterMailError} Does not throw on creation; errors surface on send.
   */
  constructor(private readonly credentials: IgniterMailAdapterCredentials = {}) {}

  /**
   * Sends an email using SendGrid (HTTP API).
   *
   * @param params - Email payload to send.
   * @returns Resolves when the email is accepted by SendGrid.
   * @throws {IgniterMailError} When credentials are missing or the API fails.
   *
   * @example
   * ```ts
   * await adapter.send({ to: 'user@example.com', subject: 'Hi', html: '<p>Hi</p>', text: 'Hi' })
   * ```
   */
  async send(params: IgniterMailAdapterSendParams): Promise<void> {
    if (!this.credentials.secret) {
      throw new IgniterMailError({
        code: 'MAIL_ADAPTER_CONFIGURATION_INVALID',
        message: 'SendGrid adapter secret is required',
      })
    }

    if (!this.credentials.from) {
      throw new IgniterMailError({
        code: 'MAIL_ADAPTER_CONFIGURATION_INVALID',
        message: 'SendGrid adapter from is required',
      })
    }

    const apiKey = this.credentials.secret
    const from = this.credentials.from

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: params.to }],
          },
        ],
        from: { email: from },
        subject: params.subject,
        content: [
          { type: 'text/plain', value: params.text },
          { type: 'text/html', value: params.html },
        ],
      }),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')

      throw new IgniterMailError({
        code: 'MAIL_PROVIDER_SEND_FAILED',
        message: 'SendGrid send failed',
        metadata: {
          status: response.status,
          body,
        },
      })
    }
  }
}
