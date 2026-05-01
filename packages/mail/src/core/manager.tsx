import type { IgniterLogger } from "@igniter-js/common";
import React from "react";
import { render } from "@react-email/components";
import { IgniterMailError } from "../errors/mail.error";
import type { IgniterMailAdapter } from "../types/adapter";
import type {
  IgniterMailInfer,
  IgniterMailOptions,
  IgniterMailQueueConfig,
  IgniterMailSendParams,
  IIgniterMail,
  IgniterMailTemplatesAPI,
} from "../types/provider";
import type {
  IgniterMailTemplateBuilt,
  IgniterMailTemplateKey,
  IgniterMailTemplateMeta,
  IgniterMailTemplatePayload,
} from "../types/templates";
import { IgniterMailSchema } from "../utils/schema";
import type { IgniterTelemetryManager } from "@igniter-js/telemetry";
import type { IgniterMailTelemetryEvents } from "../telemetry";

/**
 * Mail runtime for Igniter.js.
 *
 * This class is designed to be extracted into the `@igniter-js/mail` package.
 */
export class IgniterMailManagerCore<
  TTemplates extends object,
> implements IIgniterMail<TTemplates> {
  private readonly adapter: IgniterMailAdapter;
  private readonly templateRegistry: TTemplates;
  private readonly logger?: IgniterLogger;
  private readonly telemetry?: IgniterTelemetryManager<IgniterMailTelemetryEvents>;
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

  /**
   * Template registry helpers.
   */
  public readonly templates: IgniterMailTemplatesAPI<TTemplates>;

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
    this.templateRegistry = templates;
    this.logger = logger;
    this.telemetry = telemetry;
    this.queue = queue;
    this.options = rest;

    this.templates = {
      list: async () => this.listTemplates(),
      get: async (id) => this.getTemplate(id),
      render: async (id, variables) => this.renderTemplate(id, variables),
    };
  }

  private buildTemplateMeta(
    key: string,
    template: IgniterMailTemplateBuilt<any>,
  ): IgniterMailTemplateMeta {
    const now = new Date().toISOString();
    return {
      id: key,
      name: template.name ?? key,
      description: template.description ?? `Template ${key}`,
      path: template.path ?? `mail/${key}`,
      subject: template.subject,
      createdAt: template.createdAt ?? now,
      updatedAt: template.updatedAt ?? now,
      variables: template.variables,
    };
  }

  private async listTemplates(): Promise<IgniterMailTemplateMeta[]> {
    const startTime = Date.now();

    this.logger?.debug("IgniterMail.templates.list started");
    this.telemetry?.emit('igniter.mail.templates.list.started', {
      level: "debug",
      attributes: {},
    });

    try {
      const results = Object.entries(this.templateRegistry as any).map(
        ([key, template]) =>
          this.buildTemplateMeta(
            key,
            template as IgniterMailTemplateBuilt<any>,
          ),
      );

      this.telemetry?.emit('igniter.mail.templates.list.success', {
        level: "info",
        attributes: {
          "ctx.mail.template.count": results.length,
          "ctx.mail.duration_ms": Date.now() - startTime,
        },
      });

      this.logger?.info("IgniterMail.templates.list success", {
        count: results.length,
        durationMs: Date.now() - startTime,
      });

      return results;
    } catch (error) {
      const normalizedError = IgniterMailError.is(error)
        ? error
        : new IgniterMailError({
            code: "MAIL_PROVIDER_TEMPLATE_LIST_FAILED",
            message: "MAIL_PROVIDER_TEMPLATE_LIST_FAILED",
            cause: error,
            logger: this.logger,
          });

      this.telemetry?.emit('igniter.mail.templates.list.error', {
        level: "error",
        attributes: {
          "ctx.mail.error.code": normalizedError.code,
          "ctx.mail.error.message": normalizedError.message,
          "ctx.mail.duration_ms": Date.now() - startTime,
        },
      });

      this.logger?.error("IgniterMail.templates.list failed", normalizedError);
      throw normalizedError;
    }
  }

  private async getTemplate<
    TSelectedTemplate extends IgniterMailTemplateKey<TTemplates>,
  >(
    id: TSelectedTemplate,
  ): Promise<IgniterMailTemplateMeta | null> {
    const startTime = Date.now();

    this.logger?.debug("IgniterMail.templates.get started", {
      template: String(id),
    });
    this.telemetry?.emit('igniter.mail.templates.get.started', {
      level: "debug",
      attributes: {
        "ctx.mail.template_id": String(id),
      },
    });

    try {
      const template = (this.templateRegistry as any)[id] as
        | IgniterMailTemplateBuilt<any>
        | undefined;

      if (!template) {
        this.telemetry?.emit('igniter.mail.templates.get.success', {
          level: "info",
          attributes: {
            "ctx.mail.template_id": String(id),
            "ctx.mail.duration_ms": Date.now() - startTime,
          },
        });
        return null;
      }

      const result = this.buildTemplateMeta(String(id), template);

      this.telemetry?.emit('igniter.mail.templates.get.success', {
        level: "info",
        attributes: {
          "ctx.mail.template_id": String(id),
          "ctx.mail.duration_ms": Date.now() - startTime,
        },
      });

      return result;
    } catch (error) {
      const normalizedError = IgniterMailError.is(error)
        ? error
        : new IgniterMailError({
            code: "MAIL_PROVIDER_TEMPLATE_GET_FAILED",
            message: "MAIL_PROVIDER_TEMPLATE_GET_FAILED",
            cause: error,
            logger: this.logger,
            metadata: { template: String(id) },
          });

      this.telemetry?.emit('igniter.mail.templates.get.error', {
        level: "error",
        attributes: {
          "ctx.mail.template_id": String(id),
          "ctx.mail.error.code": normalizedError.code,
          "ctx.mail.error.message": normalizedError.message,
          "ctx.mail.duration_ms": Date.now() - startTime,
        },
      });

      this.logger?.error("IgniterMail.templates.get failed", normalizedError);
      throw normalizedError;
    }
  }

  private async renderTemplate<
    TSelectedTemplate extends IgniterMailTemplateKey<TTemplates>,
  >(
    id: TSelectedTemplate,
    variables?: IgniterMailTemplatePayload<TTemplates[TSelectedTemplate]>,
  ): Promise<{ html: string; text: string }> {
    const startTime = Date.now();

    this.logger?.debug("IgniterMail.templates.render started", {
      template: String(id),
    });
    this.telemetry?.emit('igniter.mail.templates.render.started', {
      level: "debug",
      attributes: {
        "ctx.mail.template_id": String(id),
      },
    });

    try {
      const template = (this.templateRegistry as any)[id] as
        | IgniterMailTemplateBuilt<any>
        | undefined;

      if (!template) {
        throw new IgniterMailError({
          code: "MAIL_PROVIDER_TEMPLATE_NOT_FOUND",
          message: "MAIL_PROVIDER_TEMPLATE_NOT_FOUND",
          logger: this.logger,
          metadata: { template: String(id) },
        });
      }

      const validatedData = await this.validateTemplateData(
        template,
        (variables ?? {}) as IgniterMailTemplatePayload<typeof template>,
      );
      const MailTemplate = template.render;

      const html = await render(
        <MailTemplate {...(validatedData as any)} />,
      );
      const text = await render(
        <MailTemplate {...(validatedData as any)} />,
        { plainText: true },
      );

      this.telemetry?.emit('igniter.mail.templates.render.success', {
        level: "info",
        attributes: {
          "ctx.mail.template_id": String(id),
          "ctx.mail.duration_ms": Date.now() - startTime,
        },
      });

      this.logger?.info("IgniterMail.templates.render success", {
        template: String(id),
        durationMs: Date.now() - startTime,
      });

      return { html, text };
    } catch (error) {
      const normalizedError = IgniterMailError.is(error)
        ? error
        : new IgniterMailError({
            code: "MAIL_PROVIDER_TEMPLATE_RENDER_FAILED",
            message: "MAIL_PROVIDER_TEMPLATE_RENDER_FAILED",
            cause: error,
            logger: this.logger,
            metadata: { template: String(id) },
          });

      this.telemetry?.emit('igniter.mail.templates.render.error', {
        level: "error",
        attributes: {
          "ctx.mail.template_id": String(id),
          "ctx.mail.error.code": normalizedError.code,
          "ctx.mail.error.message": normalizedError.message,
          "ctx.mail.duration_ms": Date.now() - startTime,
        },
      });

      this.logger?.error("IgniterMail.templates.render failed", normalizedError);
      throw normalizedError;
    }
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

      this.telemetry?.emit('igniter.mail.send.started', {
        level: "debug",
        attributes: {
          "mail.to": params.to,
          "mail.template": String(params.template),
          "mail.subject": params.subject,
        },
      });

      await this.onSendStarted(params);

      const template = (this.templateRegistry as any)[params.template] as
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

      this.telemetry?.emit('igniter.mail.send.success', {
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

      this.telemetry?.emit('igniter.mail.send.error', {
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

    this.telemetry?.emit('igniter.mail.schedule.started', {
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

      this.telemetry?.emit('igniter.mail.schedule.success', {
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

      this.telemetry?.emit('igniter.mail.schedule.error', {
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
