import type { StandardSchemaV1 } from '@igniter-js/core'
import { IgniterMailError } from '../errors/mail.error'

/**
 * Schema utilities for `@igniter-js/mail`.
 */
export class IgniterMailSchema {
  /**
   * Validates an unknown input using `StandardSchemaV1` when the schema provides `~standard.validate`.
   *
   * If the schema does not provide a validator, this method returns the input as-is.
   */
  static async validateInput<TSchema extends StandardSchemaV1>(
    schema: TSchema,
    input: unknown,
  ): Promise<StandardSchemaV1.InferInput<TSchema>> {
    const standard = (schema as any)?.['~standard'] as
      | {
          validate: (value: unknown) =>
            | { value?: unknown; issues?: unknown[] }
            | Promise<{ value?: unknown; issues?: unknown[] }>
        }
      | undefined

    if (!standard?.validate) {
      return input as StandardSchemaV1.InferInput<TSchema>
    }

    const result = await standard.validate(input)

    if ((result as any)?.issues?.length) {
      throw new IgniterMailError({
        code: 'MAIL_PROVIDER_TEMPLATE_DATA_INVALID',
        message: 'Invalid mail template payload',
        statusCode: 400,
        details: (result as any).issues,
      })
    }

    return ((result as any)?.value ?? input) as StandardSchemaV1.InferInput<TSchema>
  }

  /**
   * Creates a passthrough StandardSchema validator.
   */
  static createPassthroughSchema(): StandardSchemaV1 {
    return {
      '~standard': {
        vendor: '@igniter-js/mail',
        version: 1,
        validate: async (value: unknown) => ({ value }),
      },
    } satisfies StandardSchemaV1
  }
}
