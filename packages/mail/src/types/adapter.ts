/**
 * Parameters used by a mail adapter to send an email.
 */
export interface MailAdapterSendParams {
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
 * Adapter interface used by {@link IgniterMail}.
 *
 * Adapters will eventually be imported from `@igniter-js/mail/adapters`.
 */
export interface MailAdapter {
  /** Sends an email using the underlying provider. */
  send: (params: MailAdapterSendParams) => Promise<void>
}
