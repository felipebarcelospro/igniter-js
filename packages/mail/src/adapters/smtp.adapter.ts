import nodemailer from 'nodemailer'

import { IgniterMailError } from '../errors/igniter-mail.error'
import type { MailAdapter } from '../types/adapter'
import type { LegacyIgniterMailOptions } from '../types/provider'

export class SmtpMailAdapterBuilder {
  private secret?: string
  private from?: string

  /** Creates a new builder instance. */
  static create() {
    return new SmtpMailAdapterBuilder()
  }

  /** Sets the SMTP connection URL (e.g. `smtps://user:pass@host:port`). */
  withSecret(secret: string) {
    this.secret = secret
    return this
  }

  /** Sets the default FROM address used when sending emails via SMTP. */
  withFrom(from: string) {
    this.from = from
    return this
  }

  /** Builds the adapter instance. */
  build(): MailAdapter {
    if (!this.secret) {
      throw new IgniterMailError({
        code: 'MAIL_ADAPTER_CONFIGURATION_INVALID',
        message: 'SMTP adapter secret is required',
      })
    }

    if (!this.from) {
      throw new IgniterMailError({
        code: 'MAIL_ADAPTER_CONFIGURATION_INVALID',
        message: 'SMTP adapter from is required',
      })
    }

    const smtpUrl = this.secret
    const from = this.from

    const createTransporter = () => {
      return nodemailer.createTransport(smtpUrl, {
        tls: {
          rejectUnauthorized: false,
        },
        connectionTimeout: 10000,
        greetingTimeout: 5000,
        socketTimeout: 10000,
      })
    }

    return {
      /** Sends an email using Nodemailer over SMTP. */
      send: async ({ to, subject, html, text }) => {
        const transport = createTransporter()
        const mailOptions = {
          from,
          to,
          subject,
          html,
          text,
        }

        try {
          await transport.sendMail(mailOptions)
          transport.close()
        } catch (error) {
          transport.close()
          throw error
        }
      },
    }
  }
}

/**
 * Legacy adapter factory.
 */
export const smtpAdapter = (options: LegacyIgniterMailOptions) =>
  SmtpMailAdapterBuilder.create()
    .withSecret(options.secret)
    .withFrom(options.from)
    .build()

