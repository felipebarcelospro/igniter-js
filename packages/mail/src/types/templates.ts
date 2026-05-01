import type { StandardSchemaV1 } from "@igniter-js/common";
import type { ReactElement } from 'react'

/**
 * Email template definition used by {@link IgniterMail}.
 */
export interface IgniterMailTemplateBuilt<TSchema extends StandardSchemaV1> {
  /** Default subject for the template (can be overridden per-send). */
  subject: string
  /** Optional display name for Studio and tooling. */
  name?: string
  /** Optional description for Studio and tooling. */
  description?: string
  /** Optional path hint for Studio and tooling. */
  path?: string
  /** Optional created timestamp (ISO string). */
  createdAt?: string
  /** Optional updated timestamp (ISO string). */
  updatedAt?: string
  /** Optional list of variable names for Studio and tooling. */
  variables?: string[]
  /** Schema used to validate and infer template payload. */
  schema: TSchema
  /** React Email component renderer. */
  render: (data: StandardSchemaV1.InferInput<TSchema>) => ReactElement
}

/**
 * Template metadata exposed by {@link IIgniterMail}.
 */
export interface IgniterMailTemplateMeta {
  /** Template identifier (registry key). */
  id: string
  /** Display name. */
  name: string
  /** Description for UI listings. */
  description: string
  /** Path hint for routing. */
  path: string
  /** Subject line for the template. */
  subject: string
  /** Creation timestamp (ISO string). */
  createdAt: string
  /** Last update timestamp (ISO string). */
  updatedAt: string
  /** Optional list of variables for the template. */
  variables?: string[]
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
