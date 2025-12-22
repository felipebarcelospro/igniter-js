import type { StandardSchemaV1 } from '@igniter-js/core'
import type { ReactElement } from 'react'

/**
 * Email template definition used by {@link IgniterMail}.
 */
export interface IgniterMailTemplateBuilt<TSchema extends StandardSchemaV1> {
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
export type IgniterMailTemplateKey<TTemplates extends object> = {
  [K in keyof TTemplates]: TTemplates[K] extends IgniterMailTemplateBuilt<any>
    ? K
    : never
}[keyof TTemplates] & string

/**
 * Extracts the payload type from a template.
 */
export type IgniterMailTemplatePayload<TTemplate> =
  TTemplate extends IgniterMailTemplateBuilt<infer TSchema>
    ? StandardSchemaV1.InferInput<TSchema>
    : never
