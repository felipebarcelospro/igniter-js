import { IgniterMailError } from '../errors/igniter-mail.error'
import type { MailAdapter } from '../types/adapter'
import type { LegacyIgniterMailOptions } from '../types/provider'

/**
 * Postmark adapter builder.
 *
 * Notes:
 * - This implementation uses `fetch` (no SDK dependency).
 * - Designed to be extracted to `@igniter-js/mail/adapters/postmark`.
 */
export class PostmarkMailAdapterBuilder {
  private secret?: string
  private from?: string

  /** Creates a new builder instance. */
  static create() {
    return new PostmarkMailAdapterBuilder()
  }

  /** Sets the Postmark Server Token. */
  withSecret(secret: string) {
    this.secret = secret
    return this
  }

  /** Sets the default FROM address used when sending emails via Postmark. */
  withFrom(from: string) {
    this.from = from
    return this
  }

  /** Builds the adapter instance. */
  build(): MailAdapter {
    if (!this.secret) {
      throw new IgniterMailError({
        code: 'MAIL_ADAPTER_CONFIGURATION_INVALID',
        message: 'Postmark adapter secret is required',
      })
    }

    if (!this.from) {
      throw new IgniterMailError({
        code: 'MAIL_ADAPTER_CONFIGURATION_INVALID',
        message: 'Postmark adapter from is required',
      })
    }

    const token = this.secret
    const from = this.from

    return {
      /** Sends an email using Postmark (HTTP API). */
      send: async ({ to, subject, html, text }) => {
        const response = await fetch('https://api.postmarkapp.com/email', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Postmark-Server-Token': token,
          },
          body: JSON.stringify({
            From: from,
            To: to,
            Subject: subject,
            HtmlBody: html,
            TextBody: text,
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
      },
    }
  }
}

/**
 * Legacy adapter factory.
 */
export const postmarkAdapter = (options: LegacyIgniterMailOptions) =>
  PostmarkMailAdapterBuilder.create()
    .withSecret(options.secret)
    .withFrom(options.from)
    .build()
