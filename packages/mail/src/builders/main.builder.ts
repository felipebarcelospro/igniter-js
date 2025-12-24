import type { IgniterJobQueueAdapter, IgniterLogger } from "@igniter-js/core";
import { PostmarkMailAdapter } from "../adapters/postmark.adapter";
import { ResendMailAdapter } from "../adapters/resend.adapter";
import { SendGridMailAdapter } from "../adapters/sendgrid.adapter";
import { SmtpMailAdapter } from "../adapters/smtp.adapter";
import { IgniterMailError } from "../errors/mail.error";
import type { IgniterMailAdapter } from "../types/adapter";
import type {
  IgniterMailOptions,
  IgniterMailQueueOptions,
  IgniterMailSendParams,
  IIgniterMail,
} from "../types/provider";
import type { IgniterMailTemplateBuilt } from "../types/templates";
import { IgniterMailManagerCore } from "../core/manager";
import type { IgniterTelemetryManager } from "@igniter-js/telemetry";

/**
 * Builder for {@link IgniterMail}.
 *
 * This API is designed to remain stable when extracted to `@igniter-js/mail`.
 */
export class IgniterMailBuilder<
  TTemplates extends Record<string, IgniterMailTemplateBuilt<any>> = Record<string, IgniterMailTemplateBuilt<any>>,
> {
  private from?: string;
  private adapter?: IgniterMailAdapter;
  private templates: TTemplates = {} as TTemplates;
  private logger?: IgniterLogger;
  private telemetry?: IgniterTelemetryManager;
  private queue?: {
    adapter: IgniterJobQueueAdapter<any>;
    options?: IgniterMailQueueOptions;
  };

  private onSendStartedHandler?: (
    params: IgniterMailSendParams<
      TTemplates,
      any
    >,
  ) => Promise<void>;

  private onSendErrorHandler?: (
    params: IgniterMailSendParams<
      TTemplates,
      any
    >,
    error: Error,
  ) => Promise<void>;

  private onSendSuccessHandler?: (
    params: IgniterMailSendParams<
      TTemplates,
      any
    >,
  ) => Promise<void>;

  private constructor(
    options: IgniterMailOptions<any>,
  ) {
    this.from = options.from;
    this.adapter = options.adapter;
    this.templates = options.templates;
    this.logger = options.logger;
    this.telemetry = options.telemetry;
    this.onSendStartedHandler = options.onSendStarted;
    this.onSendErrorHandler = options.onSendError;
    this.onSendSuccessHandler = options.onSendSuccess;
    if (options.queue) {
      this.queue = {
        adapter: options.queue.adapter,
        options: options.queue.options,
      };
    }
  }

  /**
   * Creates a new builder.
   */
  static create() {
    return new IgniterMailBuilder<{}>({ from: '', adapter: {} as any, templates: {} });
  }

  /** Sets the default FROM address. */
  withFrom(from: string) {
    this.from = from;
    return this;
  }

  /** Attaches a logger instance. */
  withLogger(logger: IgniterLogger) {
    this.logger = logger;
    return this;
  }

  /** Attaches a telemetry instance for observability. */
  withTelemetry(telemetry: IgniterTelemetryManager) {
    this.telemetry = telemetry;
    return this;
  }

  /**
   * Enables queue delivery.
   *
   * When configured, `IgniterMail.schedule()` will enqueue jobs using the queue adapter.
   */
  withQueue(
    adapter: IgniterJobQueueAdapter<any>,
    options?: IgniterMailQueueOptions,
  ) {
    this.queue = { adapter, options };
    return this;
  }

  /**
   * Configures the adapter.
   *
   * - Use an adapter instance for full control.
   * - Or pass a provider key + secret for built-in adapters.
   */
  withAdapter(adapter: IgniterMailAdapter): this;
  withAdapter(provider: string, secret: string): this;
  withAdapter(adapterOrProvider: IgniterMailAdapter | string, secret?: string) {
    if (typeof adapterOrProvider === "string") {
      if (!secret) {
        throw new IgniterMailError({
          code: "MAIL_PROVIDER_ADAPTER_SECRET_REQUIRED",
          message: "MAIL_PROVIDER_ADAPTER_SECRET_REQUIRED",
          logger: this.logger,
        });
      }

      switch (adapterOrProvider) {
        case "resend":
          this.adapter = ResendMailAdapter.create({
            secret,
            from: this.from,
          })
          return this

        case "smtp":
          this.adapter = SmtpMailAdapter.create({
            secret,
            from: this.from,
          })
          return this

        case "postmark":
          this.adapter = PostmarkMailAdapter.create({
            secret,
            from: this.from,
          })
          return this

        case "sendgrid":
          this.adapter = SendGridMailAdapter.create({
            secret,
            from: this.from,
          })
          return this

        default:
          throw new IgniterMailError({
            code: "MAIL_PROVIDER_ADAPTER_NOT_FOUND",
            message: `MAIL_PROVIDER_ADAPTER_NOT_FOUND: ${adapterOrProvider}`,
            logger: this.logger,
            metadata: {
              provider: adapterOrProvider,
            },
          });
      }
    }

    this.adapter = adapterOrProvider;

    return this;
  }

  /**
   * Registers a template.
   */
  addTemplate<TKey extends string, TTemplate extends IgniterMailTemplateBuilt<any>>(
    key: TKey,
    template: TTemplate,
  ) {
    return new IgniterMailBuilder<
      TTemplates & { [K in TKey]: TTemplate }
    >({
      from: this.from!,
      adapter: this.adapter!,
      templates: {
        ...this.templates,
        [key]: template,
      } as TTemplates & { [K in TKey]: TTemplate },
      logger: this.logger,
      telemetry: this.telemetry,
      onSendStarted: this.onSendStartedHandler,
      onSendError: this.onSendErrorHandler,
      onSendSuccess: this.onSendSuccessHandler,
      queue: this.queue
        ? {
            adapter: this.queue.adapter,
            options: this.queue.options,
          }
        : undefined,
    });
  }

  /** Hook invoked before sending. */
  onSendStarted(
    handler: (
      params: IgniterMailSendParams<
        Record<string, IgniterMailTemplateBuilt<any>>,
        any
      >,
    ) => Promise<void>,
  ) {
    this.onSendStartedHandler = handler;
    return this;
  }

  /** Hook invoked on error. */
  onSendError(
    handler: (
      params: IgniterMailSendParams<
        Record<string, IgniterMailTemplateBuilt<any>>,
        any
      >,
      error: Error,
    ) => Promise<void>,
  ) {
    this.onSendErrorHandler = handler;
    return this;
  }

  /** Hook invoked on success. */
  onSendSuccess(
    handler: (
      params: IgniterMailSendParams<
        Record<string, IgniterMailTemplateBuilt<any>>,
        any
      >,
    ) => Promise<void>,
  ) {
    this.onSendSuccessHandler = handler;
    return this;
  }

  /**
   * Builds the {@link IgniterMail} instance.
   */
  build(): IIgniterMail<TTemplates> {
    if (!this.from) {
      throw new IgniterMailError({
        code: "MAIL_PROVIDER_FROM_REQUIRED",
        message: "MAIL_PROVIDER_FROM_REQUIRED",
        logger: this.logger,
      });
    }

    if (!this.adapter) {
      throw new IgniterMailError({
        code: "MAIL_PROVIDER_ADAPTER_REQUIRED",
        message: "MAIL_PROVIDER_ADAPTER_REQUIRED",
        logger: this.logger,
      });
    }

    return new IgniterMailManagerCore<TTemplates>({
      from: this.from,
      adapter: this.adapter,
      templates: this.templates as TTemplates,
      onSendStarted: this.onSendStartedHandler as any,
      onSendError: this.onSendErrorHandler as any,
      onSendSuccess: this.onSendSuccessHandler as any,
      telemetry: this.telemetry,
      logger: this.logger,
      queue: this.queue
        ? {
            adapter: this.queue.adapter,
            options: this.queue.options,
          }
        : undefined,
    });
  }
}

export const IgniterMail = IgniterMailBuilder
