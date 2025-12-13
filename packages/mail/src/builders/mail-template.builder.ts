import type { StandardSchemaV1 } from '@igniter-js/core'
import type { ReactElement } from 'react'
import { IgniterMailError } from '../errors/igniter-mail.error'
import type { IgniterMailTemplate } from '../types/templates'

/**
 * Builder for {@link IgniterMailTemplate}.
 */
export class MailTemplateBuilder<TSchema extends StandardSchemaV1 = StandardSchemaV1> {
  private subject?: string
  private schema?: StandardSchemaV1
  private render?: (data: any) => ReactElement

  /** Creates a new builder instance. */
  static create() {
    return new MailTemplateBuilder<any>()
  }

  /** Sets the default subject for the template. */
  withSubject(subject: string) {
    this.subject = subject
    return this
  }

  /** Attaches the schema used to validate and infer payload types. */
  withSchema<TNextSchema extends StandardSchemaV1>(schema: TNextSchema) {
    this.schema = schema
    return this as unknown as MailTemplateBuilder<TNextSchema>
  }

  /** Sets the React Email render function for the template. */
  withRender(
    render: (
      data: StandardSchemaV1.InferInput<TSchema>,
    ) => ReactElement,
  ) {
    this.render = render as any
    return this
  }

  /** Builds the template definition. */
  build(): IgniterMailTemplate<TSchema> {
    if (!this.subject) {
      throw new IgniterMailError({
        code: 'MAIL_TEMPLATE_CONFIGURATION_INVALID',
        message: 'Mail template subject is required',
      })
    }

    if (!this.schema) {
      throw new IgniterMailError({
        code: 'MAIL_TEMPLATE_CONFIGURATION_INVALID',
        message: 'Mail template schema is required',
      })
    }

    if (!this.render) {
      throw new IgniterMailError({
        code: 'MAIL_TEMPLATE_CONFIGURATION_INVALID',
        message: 'Mail template render is required',
      })
    }

    return {
      subject: this.subject,
      schema: this.schema as TSchema,
      render: this.render as IgniterMailTemplate<TSchema>['render'],
    }
  }
}

