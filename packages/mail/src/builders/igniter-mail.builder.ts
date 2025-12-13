import type { IgniterJobQueueAdapter, IgniterLogger } from '@igniter-js/core'
import { PostmarkMailAdapterBuilder } from '../adapters/postmark.adapter'
import { ResendMailAdapterBuilder } from '../adapters/resend.adapter'
import { SendGridMailAdapterBuilder } from '../adapters/sendgrid.adapter'
import { SmtpMailAdapterBuilder } from '../adapters/smtp.adapter'
import { WebhookMailAdapterBuilder } from '../adapters/webhook.adapter'
import { IgniterMailError } from '../errors/igniter-mail.error'
import type { MailAdapter } from '../types/adapter'
import type {
  IgniterMailOptions,
  IgniterMailQueueOptions,
  IgniterMailSendParams,
  IIgniterMail,
} from '../types/provider'
import type { IgniterMailTemplate } from '../types/templates'

type AdapterInput =
  | { kind: 'adapter'; adapter: MailAdapter }
  | { kind: 'provider'; provider: string; secret: string }

/**
 * Builder for {@link IgniterMail}.
 *
 * This API is designed to remain stable when extracted to `@igniter-js/mail`.
 */
export class IgniterMailBuilder<
  TTemplates extends object = Record<never, never>,
> {
  private readonly factory: (
    options: IgniterMailOptions<TTemplates>,
  ) => IIgniterMail<TTemplates>
  private from?: string
  private adapter?: AdapterInput
  private templates: Record<string, IgniterMailTemplate<any>> = {}

  private logger?: IgniterLogger
  private queue?: {
    adapter: IgniterJobQueueAdapter<any>
    options?: IgniterMailQueueOptions
  }

  private onSendStarted?: (
    params: IgniterMailSendParams<
      Record<string, IgniterMailTemplate<any>>,
      any
    >,
  ) => Promise<void>

  private onSendError?: (
    params: IgniterMailSendParams<
      Record<string, IgniterMailTemplate<any>>,
      any
    >,
    error: Error,
  ) => Promise<void>

  private onSendSuccess?: (
    params: IgniterMailSendParams<
      Record<string, IgniterMailTemplate<any>>,
      any
    >,
  ) => Promise<void>

  private constructor(
    factory: (
      options: IgniterMailOptions<TTemplates>,
    ) => IIgniterMail<TTemplates>,
  ) {
    this.factory = factory
  }

  /**
   * Creates a new builder.
   */
  static create(
    factory: (options: IgniterMailOptions<any>) => IIgniterMail<any>,
  ) {
    return new IgniterMailBuilder<Record<never, never>>(factory as any)
  }

  /** Sets the default FROM address. */
  withFrom(from: string) {
    this.from = from
    return this
  }

  /** Attaches a logger instance. */
  withLogger(logger: IgniterLogger) {
    this.logger = logger
    return this
  }

  /**
   * Enables queue delivery.
   *
   * If configured, `IgniterMail.schedule()` will enqueue jobs instead of using `setTimeout`.
   */
  withQueue(
    adapter: IgniterJobQueueAdapter<any>,
    options?: IgniterMailQueueOptions,
  ) {
    this.queue = { adapter, options }
    return this
  }

  /**
   * Configures the adapter.
   *
   * - Use an adapter instance for full control.
   * - Or pass a provider key + secret for built-in adapters.
   */
  withAdapter(adapter: MailAdapter): this
  withAdapter(provider: string, secret: string): this
  withAdapter(adapterOrProvider: MailAdapter | string, secret?: string) {
    if (typeof adapterOrProvider === 'string') {
      if (!secret) {
        throw new IgniterMailError({
          code: 'MAIL_PROVIDER_ADAPTER_SECRET_REQUIRED',
          message: 'MAIL_PROVIDER_ADAPTER_SECRET_REQUIRED',
          logger: this.logger,
        })
      }

      this.adapter = {
        kind: 'provider',
        provider: adapterOrProvider,
        secret,
      }

      return this
    }

    this.adapter = {
      kind: 'adapter',
      adapter: adapterOrProvider,
    }

    return this
  }

  /**
   * Registers a template.
   */
  addTemplate<TKey extends string, TTemplate extends IgniterMailTemplate<any>>(
    key: TKey,
    template: TTemplate,
  ) {
    this.templates[key] = template
    return this as unknown as IgniterMailBuilder<
      TTemplates & Record<TKey, TTemplate>
    >
  }

  /** Hook invoked before sending. */
  withOnSendStarted(
    onSendStarted: (
      params: IgniterMailSendParams<
        Record<string, IgniterMailTemplate<any>>,
        any
      >,
    ) => Promise<void>,
  ) {
    this.onSendStarted = onSendStarted
    return this
  }

  /** Hook invoked on error. */
  withOnSendError(
    onSendError: (
      params: IgniterMailSendParams<
        Record<string, IgniterMailTemplate<any>>,
        any
      >,
      error: Error,
    ) => Promise<void>,
  ) {
    this.onSendError = onSendError
    return this
  }

  /** Hook invoked on success. */
  withOnSendSuccess(
    onSendSuccess: (
      params: IgniterMailSendParams<
        Record<string, IgniterMailTemplate<any>>,
        any
      >,
    ) => Promise<void>,
  ) {
    this.onSendSuccess = onSendSuccess
    return this
  }

  /**
   * Builds the {@link IgniterMail} instance.
   */
  build(): IIgniterMail<TTemplates> {
    if (!this.from) {
      throw new IgniterMailError({
        code: 'MAIL_PROVIDER_FROM_REQUIRED',
        message: 'MAIL_PROVIDER_FROM_REQUIRED',
        logger: this.logger,
      })
    }

    if (!this.adapter) {
      throw new IgniterMailError({
        code: 'MAIL_PROVIDER_ADAPTER_REQUIRED',
        message: 'MAIL_PROVIDER_ADAPTER_REQUIRED',
        logger: this.logger,
      })
    }

    const resolvedAdapter =
      this.adapter.kind === 'adapter'
        ? this.adapter.adapter
        : (() => {
            switch (this.adapter.provider) {
              case 'resend':
                return ResendMailAdapterBuilder.create()
                  .withSecret(this.adapter.secret)
                  .withFrom(this.from)
                  .build()

              case 'smtp':
                return SmtpMailAdapterBuilder.create()
                  .withSecret(this.adapter.secret)
                  .withFrom(this.from)
                  .build()

              case 'postmark':
                return PostmarkMailAdapterBuilder.create()
                  .withSecret(this.adapter.secret)
                  .withFrom(this.from)
                  .build()

              case 'sendgrid':
                return SendGridMailAdapterBuilder.create()
                  .withSecret(this.adapter.secret)
                  .withFrom(this.from)
                  .build()

              case 'webhook':
                return WebhookMailAdapterBuilder.create()
                  .withUrl(this.adapter.secret)
                  .withFrom(this.from)
                  .build()

              default:
                throw new IgniterMailError({
                  code: 'MAIL_PROVIDER_ADAPTER_NOT_FOUND',
                  message: `MAIL_PROVIDER_ADAPTER_NOT_FOUND: ${this.adapter.provider}`,
                  logger: this.logger,
                  metadata: {
                    provider: this.adapter.provider,
                  },
                })
            }
          })()

    return this.factory({
      from: this.from,
      adapter: resolvedAdapter,
      templates: this.templates as TTemplates,
      onSendStarted: this.onSendStarted as any,
      onSendError: this.onSendError as any,
      onSendSuccess: this.onSendSuccess as any,
      logger: this.logger,
      queue: this.queue
        ? {
            adapter: this.queue.adapter,
            id: `${this.queue.options?.namespace ?? 'mail'}.${this.queue.options?.task ?? 'send'}`,
            options: this.queue.options,
          }
        : undefined,
    })
  }
}
