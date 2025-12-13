import { IgniterMailError } from '../errors/igniter-mail.error'
import type { MailAdapter } from '../types/adapter'
import type { LegacyIgniterMailOptions } from '../types/provider'

/**
 * SendGrid adapter builder.
 *
 * Notes:
 * - This implementation uses `fetch` (no SDK dependency).
 * - Designed to be extracted to `@igniter-js/mail/adapters/sendgrid`.
 */
export class SendGridMailAdapterBuilder {
  private secret?: string
  private from?: string

  /** Creates a new builder instance. */
  static create() {
    return new SendGridMailAdapterBuilder()
  }

  /** Sets the SendGrid API key. */
  withSecret(secret: string) {
    this.secret = secret
    return this
  }

  /** Sets the default FROM address used when sending emails via SendGrid. */
  withFrom(from: string) {
    this.from = from
    return this
  }

  /** Builds the adapter instance. */
  build(): MailAdapter {
    if (!this.secret) {
      throw new IgniterMailError({
        code: 'MAIL_ADAPTER_CONFIGURATION_INVALID',
        message: 'SendGrid adapter secret is required',
      })
    }

    if (!this.from) {
      throw new IgniterMailError({
        code: 'MAIL_ADAPTER_CONFIGURATION_INVALID',
        message: 'SendGrid adapter from is required',
      })
    }

    const apiKey = this.secret
    const from = this.from

    return {
      /** Sends an email using SendGrid (HTTP API). */
      send: async ({ to, subject, html, text }) => {
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [{
              to: [{ email: to }],
            }],
            from: { email: from },
            subject,
            content: [
              { type: 'text/plain', value: text },
              { type: 'text/html', value: html },
            ],
          }),
        })

        // SendGrid typically returns 202 for accepted.
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
      },
    }
  }
}

/**
 * Legacy adapter factory.
 */
export const sendgridAdapter = (options: LegacyIgniterMailOptions) =>
  SendGridMailAdapterBuilder.create()
    .withSecret(options.secret)
    .withFrom(options.from)
    .build()
