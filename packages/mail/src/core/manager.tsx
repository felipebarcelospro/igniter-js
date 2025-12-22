import type { IgniterLogger } from "@igniter-js/core";
import React from "react";
import { render } from "@react-email/components";
import { IgniterMailError } from "../errors/mail.error";
import { IGNITER_MAIL_TELEMETRY_EVENTS } from "../types/telemetry";
import type { IgniterMailAdapter } from "../types/adapter";
import type {
  IgniterMailInfer,
  IgniterMailOptions,
  IgniterMailQueueConfig,
  IgniterMailSendParams,
  IIgniterMail,
} from "../types/provider";
import type { IgniterMailTelemetry } from "../types/telemetry";
import type {
  IgniterMailTemplateBuilt,
  IgniterMailTemplateKey,
  IgniterMailTemplatePayload,
} from "../types/templates";
import { IgniterMailSchema } from "../utils/schema";

/**
 * Mail runtime for Igniter.js.
 *
 * This class is designed to be extracted into the `@igniter-js/mail` package.
 */
export class IgniterMailManagerCore<
  TTemplates extends object,
> implements IIgniterMail<TTemplates> {
  private readonly adapter: IgniterMailAdapter;
  private readonly templates: TTemplates;
  private readonly logger?: IgniterLogger;
  private readonly telemetry?: IgniterMailTelemetry;
  private readonly queue?: IgniterMailQueueConfig;
  private queueJobRegistered = false;
  private queueJobRegistering?: Promise<void>;
  private readonly options: Omit<
    IgniterMailOptions<TTemplates>,
    "adapter" | "templates"
  >;

  /**
   * Type inference helper.
   * Access via `typeof mail.$Infer` (type-level only).
   */
  public readonly $Infer: IgniterMailInfer<TTemplates> =
    {} as unknown as IgniterMailInfer<TTemplates>;

  constructor(options: IgniterMailOptions<TTemplates>) {
    const { adapter, templates, logger, telemetry, queue, ...rest } = options;

    if (!adapter) {
      throw new IgniterMailError({
        code: "MAIL_PROVIDER_ADAPTER_REQUIRED",
        message: "MAIL_PROVIDER_ADAPTER_REQUIRED",
        logger,
      });
    }

    if (!templates) {
      throw new IgniterMailError({
        code: "MAIL_PROVIDER_TEMPLATES_REQUIRED",
        message: "MAIL_PROVIDER_TEMPLATES_REQUIRED",
        logger,
      });
    }

    this.adapter = adapter;
    this.templates = templates;
    this.logger = logger;
    this.telemetry = telemetry;
    this.queue = queue;
    this.options = rest;
  }

  private async ensureQueueJobRegistered(): Promise<void> {
    const queue = this.queue;
    if (!queue) return;
    if (this.queueJobRegistered) return;

    if (this.queueJobRegistering) {
      await this.queueJobRegistering;
      return;
    }

    this.queueJobRegistering = (async () => {
      const queueOptions = queue.options;

      const passthroughSchema = IgniterMailSchema.createPassthroughSchema();

      queue.adapter.register({
        name: queueOptions?.job ?? "send",
        input: passthroughSchema,        
        attempts: queueOptions?.attempts,
        priority: queueOptions?.priority,
        removeOnComplete: queueOptions?.removeOnComplete,
        removeOnFail: queueOptions?.removeOnFail,
        metadata: queueOptions?.metadata,
        limiter: queueOptions?.limiter,
        queue: { name: queueOptions?.queue ?? "mail" },
        handler: async ({ input }) => {
          await this.send(input as any);
        },
      });

      this.queueJobRegistered = true;
    })();

    try {
      await this.queueJobRegistering;
    } finally {
      this.queueJobRegistering = undefined;
    }
  }

  private async validateTemplateData<
    TTemplate extends IgniterMailTemplateBuilt<any>,
  >(
    template: TTemplate,
    data: IgniterMailTemplatePayload<TTemplate>,
  ): Promise<IgniterMailTemplatePayload<TTemplate>> {
    try {
      return (await IgniterMailSchema.validateInput(
        template.schema as any,
        data,
      )) as IgniterMailTemplatePayload<TTemplate>;
    } catch (error) {
      const normalizedError = IgniterMailError.is(error)
        ? error
        : new IgniterMailError({
            code: "MAIL_PROVIDER_TEMPLATE_DATA_INVALID",
            message: "MAIL_PROVIDER_TEMPLATE_DATA_INVALID",
            cause: error,
            logger: this.logger,
            metadata: { subject: String((template as any).subject) },
          });

      throw normalizedError;
    }
  }

  /**
   * Sends an email immediately.
   */
  async send<TSelectedTemplate extends IgniterMailTemplateKey<TTemplates>>(
    params: IgniterMailSendParams<TTemplates, TSelectedTemplate>,
  ): Promise<void> {
    const startTime = Date.now();

    try {
      this.logger?.debug("IgniterMail.send started", {
        to: params.to,
        template: String(params.template),
      });

      this.telemetry?.emit(IGNITER_MAIL_TELEMETRY_EVENTS.SEND_STARTED, {
        level: "debug",
        attributes: {
          "mail.to": params.to,
          "mail.template": String(params.template),
          "mail.subject": params.subject,
        },
      });

      await this.onSendStarted(params);

      const template = (this.templates as any)[params.template] as
        | IgniterMailTemplateBuilt<any>
        | undefined;

      if (!template) {
        throw new IgniterMailError({
          code: "MAIL_PROVIDER_TEMPLATE_NOT_FOUND",
          message: "MAIL_PROVIDER_TEMPLATE_NOT_FOUND",
          logger: this.logger,
          metadata: {
            template: String(params.template),
          },
        });
      }

      const validatedData = await this.validateTemplateData(
        template,
        params.data,
      );
      const MailTemplate = template.render;

      const html = await render(<MailTemplate {...(validatedData as any)} />);
      const text = await render(<MailTemplate {...(validatedData as any)} />, {
        plainText: true,
      });

      await this.adapter.send({
        to: params.to,
        subject: params.subject || template.subject,
        html,
        text,
      });

      await this.onSendSuccess(params);

      const durationMs = Date.now() - startTime;

      this.telemetry?.emit(IGNITER_MAIL_TELEMETRY_EVENTS.SEND_SUCCESS, {
        level: "info",
        attributes: {
          "mail.to": params.to,
          "mail.template": String(params.template),
          "mail.subject": params.subject || template.subject,
          "mail.duration_ms": durationMs,
        },
      });

      this.logger?.info("IgniterMail.send success", {
        to: params.to,
        template: String(params.template),
        durationMs,
      });
    } catch (error) {
      const normalizedError = IgniterMailError.is(error)
        ? error
        : new IgniterMailError({
            code: "MAIL_PROVIDER_SEND_FAILED",
            message: "MAIL_PROVIDER_SEND_FAILED",
            cause: error,
            logger: this.logger,
            metadata: {
              to: params.to,
              template: String(params.template),
            },
          });

      const durationMs = Date.now() - startTime;

      this.telemetry?.emit(IGNITER_MAIL_TELEMETRY_EVENTS.SEND_ERROR, {
        level: "error",
        attributes: {
          "mail.to": params.to,
          "mail.template": String(params.template),
          "mail.subject": params.subject,
          "mail.error.code": normalizedError.code,
          "mail.error.message": normalizedError.message,
          "mail.duration_ms": durationMs,
        },
      });

      this.logger?.error("IgniterMail.send failed", normalizedError);

      await this.onSendError(params, normalizedError);
      throw normalizedError;
    }
  }

  /**
   * Schedules an email for a future date.
   *
   * Requires a queue adapter; otherwise it throws.
   */
  async schedule<TSelectedTemplate extends IgniterMailTemplateKey<TTemplates>>(
    params: IgniterMailSendParams<TTemplates, TSelectedTemplate>,
    date: Date,
  ): Promise<void> {
    const startTime = Date.now();

    if (date.getTime() <= Date.now()) {
      throw new IgniterMailError({
        code: "MAIL_PROVIDER_SCHEDULE_DATE_INVALID",
        message: "MAIL_PROVIDER_SCHEDULE_DATE_INVALID",
        logger: this.logger,
      });
    }

    const delay = Math.max(0, date.getTime() - Date.now());

    this.logger?.debug("IgniterMail.schedule started", {
      to: params.to,
      template: String(params.template),
      scheduledAt: date.toISOString(),
      delayMs: delay,
    });

    this.telemetry?.emit(IGNITER_MAIL_TELEMETRY_EVENTS.SCHEDULE_STARTED, {
      level: "debug",
      attributes: {
        "mail.to": params.to,
        "mail.template": String(params.template),
        "mail.scheduled_at": date.toISOString(),
        "mail.delay_ms": delay,
      },
    });

    if (!this.queue) {
      throw new IgniterMailError({
        code: "MAIL_PROVIDER_SCHEDULE_QUEUE_NOT_CONFIGURED",
        message: "MAIL_PROVIDER_SCHEDULE_QUEUE_NOT_CONFIGURED",
        logger: this.logger,
      });
    }

    try {
      await this.ensureQueueJobRegistered();

      const queue = this.queue.options?.queue ?? "mail";
      const job = this.queue.options?.job ?? "send";
      const id = `${queue}.${job}`;

      this.logger?.info("IgniterMail.schedule enqueued", {
        to: params.to,
        template: String(params.template),
        delay,
        durationMs: Date.now() - startTime,
      });

      await this.queue.adapter.invoke({
        id,
        input: params as any,
        delay,
      });

      this.telemetry?.emit(IGNITER_MAIL_TELEMETRY_EVENTS.SCHEDULE_SUCCESS, {
        level: "info",
        attributes: {
          "mail.to": params.to,
          "mail.template": String(params.template),
          "mail.scheduled_at": date.toISOString(),
          "mail.delay_ms": delay,
          "mail.queue_id": this.queue.options?.queue ?? "mail",
        },
      });

      return;
    } catch (error) {
      let normalizedError = error as IgniterMailError;

      if (!IgniterMailError.is(error)) {
        normalizedError = new IgniterMailError({
          code: "MAIL_PROVIDER_SCHEDULE_FAILED",
          message: "MAIL_PROVIDER_SCHEDULE_FAILED",
          cause: error,
          logger: this.logger,
          metadata: {
            to: params.to,
            template: String(params.template),
            scheduledAt: date.toISOString(),
          },
        });
      }

      this.telemetry?.emit(IGNITER_MAIL_TELEMETRY_EVENTS.SCHEDULE_ERROR, {
        level: "error",
        attributes: {
          "mail.to": params.to,
          "mail.template": String(params.template),
          "mail.scheduled_at": date.toISOString(),
          "mail.error.code": normalizedError.code,
          "mail.error.message": normalizedError.message,
        },
      });

      this.logger?.error("IgniterMail.schedule failed", normalizedError);
      throw normalizedError;
    }
  }

  private async onSendStarted(
    params: IgniterMailSendParams<TTemplates, any>,
  ): Promise<void> {
    await this.options.onSendStarted?.(params);
  }

  private async onSendError(
    params: IgniterMailSendParams<TTemplates, any>,
    error: Error,
  ): Promise<void> {
    await this.options.onSendError?.(params, error);
  }

  private async onSendSuccess(
    params: IgniterMailSendParams<TTemplates, any>,
  ): Promise<void> {
    await this.options.onSendSuccess?.(params);
  }

}
