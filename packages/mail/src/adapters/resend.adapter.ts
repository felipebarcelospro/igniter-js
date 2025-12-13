import { Resend } from 'resend'

import { IgniterMailError } from '../errors/igniter-mail.error'
import type { MailAdapter } from '../types/adapter'
import type { LegacyIgniterMailOptions } from '../types/provider'

export class ResendMailAdapterBuilder {
  private secret?: string
  private from?: string

  /** Creates a new builder instance. */
  static create() {
    return new ResendMailAdapterBuilder()
  }

  /** Sets the Resend API key. */
  withSecret(secret: string) {
    this.secret = secret
    return this
  }

  /** Sets the default FROM address used when sending emails via Resend. */
  withFrom(from: string) {
    this.from = from
    return this
  }

  /** Builds the adapter instance. */
  build(): MailAdapter {
    if (!this.secret) {
      throw new IgniterMailError({
        code: 'MAIL_ADAPTER_CONFIGURATION_INVALID',
        message: 'Resend adapter secret is required',
      })
    }

    if (!this.from) {
      throw new IgniterMailError({
        code: 'MAIL_ADAPTER_CONFIGURATION_INVALID',
        message: 'Resend adapter from is required',
      })
    }

    const resend = new Resend(this.secret)
    const from = this.from

    return {
      /**
       * Sends an email using Resend.
       *
       * Note: Resend accepts `scheduledAt` as an ISO string.
       */
      send: async ({ to, subject, html, text, scheduledAt }) => {
        await resend.emails.create({
          to,
          from,
          subject,
          html,
          text,
          scheduledAt: scheduledAt?.toISOString(),
        })
      },
    }
  }
}

/**
 * Legacy adapter factory.
 */
export const resendAdapter = (options: LegacyIgniterMailOptions) =>
  ResendMailAdapterBuilder.create()
    .withSecret(options.secret)
    .withFrom(options.from)
    .build()

