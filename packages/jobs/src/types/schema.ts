/**
 * @fileoverview Schema helpers for @igniter-js/jobs
 * @module @igniter-js/jobs/types/schema
 */

import type { StandardSchemaV1 } from '@igniter-js/core'

/**
 * A schema accepted by `@igniter-js/jobs` for input validation.
 *
 * Supports:
 * - Standard Schema v1 (when available)
 * - Zod-like schemas (with `_input`/`_output` and `safeParse`/`parse`)
 */
export type IgniterJobsSchema =
  | StandardSchemaV1<any, any>
  | {
      readonly _input?: unknown
      readonly _output?: unknown
      parse: (value: unknown) => unknown
      safeParse?: (value: unknown) => { success: true; data: unknown } | { success: false; error: unknown }
    }

export type IgniterJobsInferSchemaInput<TSchema> = TSchema extends StandardSchemaV1
  ? StandardSchemaV1.InferInput<TSchema>
  : TSchema extends { _input?: infer TInput }
    ? TInput
    : unknown

export type IgniterJobsInferSchemaOutput<TSchema> = TSchema extends StandardSchemaV1
  ? StandardSchemaV1.InferOutput<TSchema>
  : TSchema extends { _output?: infer TOutput }
    ? TOutput
    : unknown

