import nodemailer from 'nodemailer'

import { IgniterMailError } from '../errors/mail.error'
import type {
  IgniterMailAdapter,
  IgniterMailAdapterCredentials,
  IgniterMailAdapterSendParams,
} from '../types/adapter'

/**
 * SMTP adapter implementation.
 *
 * Notes:
 * - Uses Nodemailer.
 * - `credentials.secret` must be an SMTP connection URL.
 *
 * @example
 * ```ts
 * const adapter = SmtpMailAdapter.create({
 *   secret: 'smtps://user:pass@host:465',
 *   from: 'no-reply@example.com',
 * })
 * await adapter.send({ to: 'user@example.com', subject: 'Hi', html: '<p>Hi</p>', text: 'Hi' })
 * ```
 */
export class SmtpMailAdapter implements IgniterMailAdapter {
  /**
   * Creates a new adapter instance.
   *
   * @param credentials - Adapter credentials including SMTP URL and default from.
   * @returns A configured SMTP adapter.
   * @throws {IgniterMailError} Does not throw on creation; errors surface on send.
   * @example
   * ```ts
   * const adapter = SmtpMailAdapter.create({ secret: 'smtps://user:pass@host:465', from: 'no-reply@acme.com' })
   * ```
   */
  static create(credentials: IgniterMailAdapterCredentials) {
    return new SmtpMailAdapter(credentials)
  }

  /**
   * Creates an adapter with credentials.
   *
   * @param credentials - Adapter credentials including SMTP URL and default from.
   * @throws {IgniterMailError} Does not throw on creation; errors surface on send.
   */
  constructor(private readonly credentials: IgniterMailAdapterCredentials = {}) {}

  /**
   * Sends an email using Nodemailer over SMTP.
   *
   * @param params - Email payload to send.
   * @returns Resolves when the email is sent.
   * @throws {IgniterMailError} When credentials are missing or the SMTP send fails.
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
        message: 'SMTP adapter secret is required',
      })
    }

    if (!this.credentials.from) {
      throw new IgniterMailError({
        code: 'MAIL_ADAPTER_CONFIGURATION_INVALID',
        message: 'SMTP adapter from is required',
      })
    }

    const smtpUrl = this.credentials.secret
    const from = this.credentials.from

    const transport = nodemailer.createTransport(smtpUrl, {
      connectionTimeout: 10000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
      tls: {
        rejectUnauthorized: false,
      },
    })

    try {
      await transport.sendMail({
        from,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      })
    } catch(error) {
      throw new IgniterMailError({
        code: 'MAIL_PROVIDER_SEND_FAILED',
        message: 'SMTP send failed',
        metadata: {
          originalError: error,
        },
      })
    } finally {
      transport.close()
    }
  }
}
