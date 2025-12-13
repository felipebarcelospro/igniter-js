import { postmarkAdapter } from '../adapters/postmark.adapter'
import { resendAdapter } from '../adapters/resend.adapter'
import { sendgridAdapter } from '../adapters/sendgrid.adapter'
import { smtpAdapter } from '../adapters/smtp.adapter'
import { webhookAdapter } from '../adapters/webhook.adapter'
import { IgniterMailError } from '../errors/igniter-mail.error'

/**
 * Resolves a legacy adapter factory by key.
 */
export const getAdapter = (adapter: string) => {
  switch (adapter) {
    case 'resend':
      return resendAdapter
    case 'smtp':
      return smtpAdapter
    case 'postmark':
      return postmarkAdapter
    case 'sendgrid':
      return sendgridAdapter
    case 'webhook':
      return webhookAdapter
    default:
      throw new IgniterMailError({
        code: 'MAIL_PROVIDER_ADAPTER_NOT_FOUND',
        message: `MAIL_PROVIDER_ADAPTER_NOT_FOUND: ${adapter}`,
        metadata: { adapter },
      })
  }
}
