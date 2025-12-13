import type { StandardSchemaV1 } from '@igniter-js/core'
import type { ReactElement } from 'react'

/**
 * Email template definition used by {@link IgniterMail}.
 */
export interface IgniterMailTemplate<TSchema extends StandardSchemaV1> {
  /** Default subject for the template (can be overridden per-send). */
  subject: string
  /** Schema used to validate and infer template payload. */
  schema: TSchema
  /** React Email component renderer. */
  render: (data: StandardSchemaV1.InferInput<TSchema>) => ReactElement
}

/**
 * Extracts the valid template keys from a template map.
 */
export type MailTemplateKey<TTemplates extends object> = {
  [K in keyof TTemplates]: TTemplates[K] extends IgniterMailTemplate<any>
    ? K
    : never
}[keyof TTemplates] & string

/**
 * Extracts the payload type from a template.
 */
export type MailTemplatePayload<TTemplate> =
  TTemplate extends IgniterMailTemplate<infer TSchema>
    ? StandardSchemaV1.InferInput<TSchema>
    : never
