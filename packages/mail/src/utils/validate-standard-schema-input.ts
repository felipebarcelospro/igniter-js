import type { StandardSchemaV1 } from '@igniter-js/core'
import { IgniterMailError } from '../errors/igniter-mail.error'

/**
 * Validates an unknown input using `StandardSchemaV1` when the schema provides `~standard.validate`.
 *
 * If the schema does not provide a validator, this function returns the input as-is.
 */
export async function validateStandardSchemaInput<TSchema extends StandardSchemaV1>(
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
