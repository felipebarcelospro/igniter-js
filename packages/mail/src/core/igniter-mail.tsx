import type { IgniterLogger, StandardSchemaV1 } from '@igniter-js/core'
import React from 'react'
import { render } from '@react-email/components'
import { IgniterMailBuilder } from '../builders/igniter-mail.builder'
import { IgniterMailError } from '../errors/igniter-mail.error'
import type { MailAdapter } from '../types/adapter'
import type {
  IgniterMailInfer,
  IgniterMailOptions,
  IgniterMailQueueConfig,
  IgniterMailSendParams,
  IIgniterMail,
  LegacyIgniterMailOptions,
} from '../types/provider'
import type {
  IgniterMailTemplate,
  MailTemplateKey,
  MailTemplatePayload,
} from '../types/templates'
import { validateStandardSchemaInput } from '../utils/validate-standard-schema-input'

/**
 * Mail runtime for Igniter.js.
 *
 * This class is designed to be extracted into the `@igniter-js/mail` package.
 */
export class IgniterMail<TTemplates extends object>
  implements IIgniterMail<TTemplates>
{
  private static instance: IIgniterMail<any> | undefined

  private readonly adapter: MailAdapter
  private readonly templates: TTemplates
  private readonly logger?: IgniterLogger
  private readonly queue?: IgniterMailQueueConfig
  private queueJobRegistered = false
  private queueJobRegistering?: Promise<void>
  private readonly options: Omit<
    IgniterMailOptions<TTemplates>,
    'adapter' | 'templates'
  >

  /**
   * Type inference helper.
   * Access via `typeof mail.$Infer` (type-level only).
   */
  public readonly $Infer: IgniterMailInfer<TTemplates> =
    undefined as unknown as IgniterMailInfer<TTemplates>

  constructor(options: IgniterMailOptions<TTemplates>) {
    const { adapter, templates, logger, queue, ...rest } = options

    if (!adapter) {
      throw new IgniterMailError({
        code: 'MAIL_PROVIDER_ADAPTER_REQUIRED',
        message: 'MAIL_PROVIDER_ADAPTER_REQUIRED',
        logger,
      })
    }

    if (!templates) {
      throw new IgniterMailError({
        code: 'MAIL_PROVIDER_TEMPLATES_REQUIRED',
        message: 'MAIL_PROVIDER_TEMPLATES_REQUIRED',
        logger,
      })
    }

    this.adapter = adapter
    this.templates = templates
    this.logger = logger
    this.queue = queue
    this.options = rest
  }

  private async ensureQueueJobRegistered(): Promise<void> {
    const queue = this.queue
    if (!queue) return
    if (this.queueJobRegistered) return

    if (this.queueJobRegistering) {
      await this.queueJobRegistering
      return
    }

    this.queueJobRegistering = (async () => {
      const queueOptions = queue.options
      const name = queueOptions?.name ?? 'send'

      const passthroughSchema = {
        '~standard': {
          vendor: '@igniter-js/mail',
          version: 1,
          validate: async (value: unknown) => ({ value }),
        },
      } satisfies StandardSchemaV1

      const definition = queue.adapter.register({
        name,
        input: passthroughSchema,
        handler: async ({ input }) => {
          await this.send(input as any)
        },
        queue: queueOptions?.queue,
        attempts: queueOptions?.attempts,
        priority: queueOptions?.priority,
        removeOnComplete: queueOptions?.removeOnComplete,
        removeOnFail: queueOptions?.removeOnFail,
        metadata: queueOptions?.metadata,
        limiter: queueOptions?.limiter,
      })

      await queue.adapter.bulkRegister({
        [queue.id]: definition as any,
      })

      this.queueJobRegistered = true
    })()

    try {
      await this.queueJobRegistering
    } finally {
      this.queueJobRegistering = undefined
    }
  }

  private async validateTemplateData<
    TTemplate extends IgniterMailTemplate<any>,
  >(
    template: TTemplate,
    data: MailTemplatePayload<TTemplate>,
  ): Promise<MailTemplatePayload<TTemplate>> {
    try {
      return (await validateStandardSchemaInput(
        template.schema as any,
        data,
      )) as MailTemplatePayload<TTemplate>
    } catch (error) {
      const normalizedError = IgniterMailError.is(error)
        ? error
        : new IgniterMailError({
            code: 'MAIL_PROVIDER_TEMPLATE_DATA_INVALID',
            message: 'MAIL_PROVIDER_TEMPLATE_DATA_INVALID',
            cause: error,
            logger: this.logger,
            metadata: { subject: String((template as any).subject) },
          })

      throw normalizedError
    }
  }

  /**
   * Sends an email immediately.
   */
  async send<TSelectedTemplate extends MailTemplateKey<TTemplates>>(
    params: IgniterMailSendParams<TTemplates, TSelectedTemplate>,
  ): Promise<void> {
    try {
      this.logger?.debug('IgniterMail.send started', {
        to: params.to,
        template: String(params.template),
      })

      await this.onSendStarted(params)

      const template = (this.templates as any)[params.template] as
        | IgniterMailTemplate<any>
        | undefined

      if (!template) {
        throw new IgniterMailError({
          code: 'MAIL_PROVIDER_TEMPLATE_NOT_FOUND',
          message: 'MAIL_PROVIDER_TEMPLATE_NOT_FOUND',
          logger: this.logger,
          metadata: {
            template: String(params.template),
          },
        })
      }

      const validatedData = await this.validateTemplateData(
        template,
        params.data,
      )
      const MailTemplate = template.render

      const html = await render(<MailTemplate {...(validatedData as any)} />)
      const text = await render(<MailTemplate {...(validatedData as any)} />, {
        plainText: true,
      })

      await this.adapter.send({
        to: params.to,
        subject: params.subject || template.subject,
        html,
        text,
      })

      await this.onSendSuccess(params)

      this.logger?.info('IgniterMail.send success', {
        to: params.to,
        template: String(params.template),
      })
    } catch (error) {
      const normalizedError = IgniterMailError.is(error)
        ? error
        : new IgniterMailError({
            code: 'MAIL_PROVIDER_SEND_FAILED',
            message: 'MAIL_PROVIDER_SEND_FAILED',
            cause: error,
            logger: this.logger,
            metadata: {
              to: params.to,
              template: String(params.template),
            },
          })

      this.logger?.error('IgniterMail.send failed', normalizedError)

      await this.onSendError(params, normalizedError)
      throw normalizedError
    }
  }

  /**
   * Schedules an email for a future date.
   *
   * If a queue is configured, this method enqueues a job.
   * Otherwise, it uses a best-effort `setTimeout`.
   */
  async schedule<TSelectedTemplate extends MailTemplateKey<TTemplates>>(
    params: IgniterMailSendParams<TTemplates, TSelectedTemplate>,
    date: Date,
  ): Promise<void> {
    if (date.getTime() <= Date.now()) {
      throw new IgniterMailError({
        code: 'MAIL_PROVIDER_SCHEDULE_DATE_INVALID',
        message: 'MAIL_PROVIDER_SCHEDULE_DATE_INVALID',
        logger: this.logger,
      })
    }

    if (this.queue) {
      try {
        await this.ensureQueueJobRegistered()
        const delay = Math.max(0, date.getTime() - Date.now())

        this.logger?.info('IgniterMail.schedule enqueued', {
          id: this.queue.id,
          to: params.to,
          template: String(params.template),
          delay,
        })

        await this.queue.adapter.invoke({
          id: this.queue.id,
          input: params as any,
          delay,
        })

        return
      } catch (error) {
        const normalizedError = IgniterMailError.is(error)
          ? error
          : new IgniterMailError({
              code: 'MAIL_PROVIDER_SCHEDULE_FAILED',
              message: 'MAIL_PROVIDER_SCHEDULE_FAILED',
              cause: error,
              logger: this.logger,
              metadata: {
                to: params.to,
                template: String(params.template),
                date: date.toISOString(),
              },
            })

        this.logger?.error('IgniterMail.schedule failed', normalizedError)
        throw normalizedError
      }
    }

    const timeout = date.getTime() - Date.now()
    setTimeout(() => {
      this.send(params).catch((error) => {
        console.error('Failed to send scheduled email:', error)
      })
    }, timeout)
  }

  private async onSendStarted(
    params: IgniterMailSendParams<TTemplates, any>,
  ): Promise<void> {
    await this.options.onSendStarted?.(params)
  }

  private async onSendError(
    params: IgniterMailSendParams<TTemplates, any>,
    error: Error,
  ): Promise<void> {
    await this.options.onSendError?.(params, error)
  }

  private async onSendSuccess(
    params: IgniterMailSendParams<TTemplates, any>,
  ): Promise<void> {
    await this.options.onSendSuccess?.(params)
  }

  /** Helper to declare adapter factories. */
  static adapter = <TOptions,>(adapter: (options: TOptions) => MailAdapter) =>
    adapter

  /** Helper to declare templates with inferred payload types. */
  static template = <TSchema extends StandardSchemaV1>(
    template: IgniterMailTemplate<TSchema>,
  ) => template

  /**
   * Creates a new builder instance.
   */
  static create = () =>
    IgniterMailBuilder.create((options) => new IgniterMail<any>(options))

  /**
   * Initializes (singleton) instance.
   *
   * Prefer using {@link IgniterMail.create} for new code.
   */
  static initialize = <TEmailTemplates extends object>(
    options:
      | IgniterMailOptions<TEmailTemplates>
      | LegacyIgniterMailOptions<TEmailTemplates>,
  ) => {
    if (IgniterMail.instance) {
      return IgniterMail.instance as IgniterMail<TEmailTemplates>
    }

    const adapter = (options as any).adapter

    if (typeof adapter === 'function') {
      const legacyOptions = options as LegacyIgniterMailOptions<TEmailTemplates>
      IgniterMail.instance = new IgniterMail<TEmailTemplates>({
        from: legacyOptions.from,
        templates: legacyOptions.templates,
        adapter: legacyOptions.adapter(legacyOptions),
        onSendStarted: legacyOptions.onSendStarted,
        onSendError: legacyOptions.onSendError,
        onSendSuccess: legacyOptions.onSendSuccess,
      }) as unknown as IIgniterMail<any>
      return IgniterMail.instance as IgniterMail<TEmailTemplates>
    }

    IgniterMail.instance = new IgniterMail<TEmailTemplates>(
      options as IgniterMailOptions<TEmailTemplates>,
    ) as unknown as IIgniterMail<any>
    return IgniterMail.instance as IgniterMail<TEmailTemplates>
  }
}
