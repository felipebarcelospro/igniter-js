import { IgniterMailError } from '../errors/igniter-mail.error'
import type { MailAdapter } from '../types/adapter'
import type { LegacyIgniterMailOptions } from '../types/provider'

/**
 * Webhook adapter builder.
 *
 * This adapter posts the email payload to an arbitrary HTTP endpoint.
 *
 * Why this exists:
 * - Useful for low-code automation (Make/Zapier/n8n) or custom internal relays.
 * - Dependency-free (uses `fetch`).
 * - Easy to extract as `@igniter-js/mail/adapters/webhook`.
 */
export class WebhookMailAdapterBuilder {
  private url?: string
  private from?: string

  /** Creates a new builder instance. */
  static create() {
    return new WebhookMailAdapterBuilder()
  }

  /**
   * Sets the webhook URL.
   *
   * Note: when using `IgniterMailBuilder.withAdapter('webhook', secret)`, the `secret`
   * is treated as the webhook URL.
   */
  withUrl(url: string) {
    this.url = url
    return this
  }

  /** Sets the default FROM address. */
  withFrom(from: string) {
    this.from = from
    return this
  }

  /** Builds the adapter instance. */
  build(): MailAdapter {
    if (!this.url) {
      throw new IgniterMailError({
        code: 'MAIL_ADAPTER_CONFIGURATION_INVALID',
        message: 'Webhook adapter url is required',
      })
    }

    if (!this.from) {
      throw new IgniterMailError({
        code: 'MAIL_ADAPTER_CONFIGURATION_INVALID',
        message: 'Webhook adapter from is required',
      })
    }

    const url = this.url
    const from = this.from

    return {
      /** Sends an email by POST-ing to the configured webhook URL. */
      send: async ({ to, subject, html, text, scheduledAt }) => {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to,
            from,
            subject,
            html,
            text,
            scheduledAt: scheduledAt?.toISOString(),
          }),
        })

        if (!response.ok) {
          const body = await response.text().catch(() => '')

          throw new IgniterMailError({
            code: 'MAIL_PROVIDER_SEND_FAILED',
            message: 'Webhook send failed',
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
export const webhookAdapter = (options: LegacyIgniterMailOptions) =>
  WebhookMailAdapterBuilder.create()
    .withUrl(options.secret)
    .withFrom(options.from)
    .build()
