import { Resend } from 'resend'

import { IgniterMailError } from '../errors/mail.error'
import type {
  IgniterMailAdapter,
  IgniterMailAdapterCredentials,
  IgniterMailAdapterSendParams,
} from '../types/adapter'

/**
 * Resend adapter implementation.
 *
 * Notes:
 * - Uses the Resend SDK.
 * - Designed to be extracted to `@igniter-js/mail/adapters/resend`.
 *
 * @example
 * ```ts
 * const adapter = ResendMailAdapter.create({
 *   secret: process.env.RESEND_API_KEY,
 *   from: 'no-reply@example.com',
 * })
 * await adapter.send({ to: 'user@example.com', subject: 'Hi', html: '<p>Hi</p>', text: 'Hi' })
 * ```
 */
export class ResendMailAdapter implements IgniterMailAdapter {
  /**
   * Creates a new adapter instance.
   *
   * @param credentials - Adapter credentials including API secret and default from.
   * @returns A configured Resend adapter.
   * @throws {IgniterMailError} Does not throw on creation; errors surface on send.
   * @example
   * ```ts
   * const adapter = ResendMailAdapter.create({ secret: 'token', from: 'no-reply@acme.com' })
   * ```
   */
  static create(credentials: IgniterMailAdapterCredentials) {
    return new ResendMailAdapter(credentials)
  }

  /**
   * Creates an adapter with credentials.
   *
   * @param credentials - Adapter credentials including API secret and default from.
   * @throws {IgniterMailError} Does not throw on creation; errors surface on send.
   */
  constructor(private readonly credentials: IgniterMailAdapterCredentials = {}) {}

  /**
   * Sends an email using Resend.
   *
   * @param params - Email payload to send.
   * @returns Resolves when the email is accepted by Resend.
   * @throws {IgniterMailError} When credentials are missing or Resend rejects the request.
   *
   * @example
   * ```ts
   * await adapter.send({ to: 'user@example.com', subject: 'Welcome', html: '<p>Hi</p>', text: 'Hi' })
   * ```
   */
  async send(params: IgniterMailAdapterSendParams): Promise<void> {
    if (!this.credentials.secret) {
      throw new IgniterMailError({
        code: 'MAIL_ADAPTER_CONFIGURATION_INVALID',
        message: 'Resend adapter secret is required',
      })
    }

    if (!this.credentials.from) {
      throw new IgniterMailError({
        code: 'MAIL_ADAPTER_CONFIGURATION_INVALID',
        message: 'Resend adapter from is required',
      })
    }

    const resend = new Resend(this.credentials.secret)
    const from = this.credentials.from

    await resend.emails.create({
      to: params.to,
      from,
      subject: params.subject,
      html: params.html,
      text: params.text,
      scheduledAt: params.scheduledAt?.toISOString(),
    })
  }
}
