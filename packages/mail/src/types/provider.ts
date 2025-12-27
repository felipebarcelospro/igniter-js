import type {
  IgniterJobQueueAdapter,
  IgniterLogger,
  JobLimiter,
} from "@igniter-js/core";
import type { IgniterMailAdapter } from "./adapter";
import type {
  IgniterMailTemplateBuilt,
  IgniterMailTemplateKey,
  IgniterMailTemplatePayload,
} from "./templates";
import type { IgniterTelemetryManager } from "@igniter-js/telemetry";

/**
 * Type inference helper exposed by the runtime instance.
 */
export type IgniterMailInfer<TTemplates extends object> = {
  /** Union of valid template keys. */
  readonly Templates: IgniterMailTemplateKey<TTemplates>;
  /** Payloads by template. */
  readonly Payloads: {
    [K in IgniterMailTemplateKey<TTemplates>]: IgniterMailTemplatePayload<TTemplates[K]>;
  };

  /**
   * Union of valid `mail.send()` inputs.
   * Useful for type-level consumption.
   */
  readonly SendInput: {
    [K in IgniterMailTemplateKey<TTemplates>]: IgniterMailSendParams<TTemplates, K>;
  }[IgniterMailTemplateKey<TTemplates>];

  /**
   * Tuple form of `mail.schedule()` inputs.
   */
  readonly ScheduleInput: [
    {
      [K in IgniterMailTemplateKey<TTemplates>]: IgniterMailSendParams<TTemplates, K>;
    }[IgniterMailTemplateKey<TTemplates>],
    Date,
  ];
};

/**
 * Queue options used when scheduling or enqueuing send jobs.
 */
export type IgniterMailQueueOptions = {
  /** Job name (default: "send"). */
  job?: string;
  /** Queue name. */
  queue?: string;
  /** Number of retry attempts on failure. */
  attempts?: number;
  /** Job priority (higher value = higher priority). */
  priority?: number;
  /** Remove job after completion. */
  removeOnComplete?: boolean | number;
  /** Remove job after failure. */
  removeOnFail?: boolean | number;
  /** Additional metadata. */
  metadata?: Record<string, any>;
  /** Optional rate limiter config. */
  limiter?: JobLimiter;
};

/**
 * Normalized queue configuration consumed by the runtime.
 */
export type IgniterMailQueueConfig = {
  /** Queue adapter instance. */
  adapter: IgniterJobQueueAdapter<any>;
  /** Optional queue options. */
  options?: IgniterMailQueueOptions;
};

/**
 * Parameters required to send an email using a template.
 */
export interface IgniterMailSendParams<
  TTemplates extends object,
  TSelectedTemplate extends IgniterMailTemplateKey<TTemplates>,
> {
  /** Recipient email address. */
  to: string;
  /** Optional subject override. */
  subject?: string;
  /** Template key. */
  template: TSelectedTemplate;
  /** Template payload (validated using StandardSchema when provided). */
  data: IgniterMailTemplatePayload<TTemplates[TSelectedTemplate]>;
}

/**
 * Hooks invoked by the runtime.
 */
export interface IgniterMailHooks<TTemplates extends object> {
  /** Invoked before rendering/sending. */
  onSendStarted?: (
    params: IgniterMailSendParams<TTemplates, any>,
  ) => Promise<void>;
  /** Invoked when sending fails. */
  onSendError?: (
    params: IgniterMailSendParams<TTemplates, any>,
    error: Error,
  ) => Promise<void>;
  /** Invoked after a successful send. */
  onSendSuccess?: (
    params: IgniterMailSendParams<TTemplates, any>,
  ) => Promise<void>;
}

/**
 * Options used to initialize {@link IgniterMail}.
 */
export interface IgniterMailOptions<
  TTemplates extends object = Record<string, IgniterMailTemplateBuilt<any>>,
> extends IgniterMailHooks<TTemplates> {
  /** Default FROM address used by the adapter. */
  from: string;
  /** Adapter implementation. */
  adapter: IgniterMailAdapter;
  /** Template registry. */
  templates: TTemplates;
  /** Optional logger used for debug/info/error logging. */
  logger?: IgniterLogger;
  /** Optional telemetry instance for observability. */
  telemetry?: IgniterTelemetryManager<any>;
  /** Optional queue configuration for asynchronous delivery. */
  queue?: IgniterMailQueueConfig;
}

/**
 * Public interface implemented by {@link IgniterMail}.
 */
export interface IIgniterMail<TTemplates extends object> {
  /**
   * Type inference helper.
   * Access via `typeof mail.$Infer` (type-level only).
   */
  readonly $Infer: IgniterMailInfer<TTemplates>;

  /** Sends an email immediately. */
  send: <TSelectedTemplate extends IgniterMailTemplateKey<TTemplates>>(
    params: IgniterMailSendParams<TTemplates, TSelectedTemplate>,
  ) => Promise<void>;

  /** Schedules an email for a future date (requires queue adapter). */
  schedule: <TSelectedTemplate extends IgniterMailTemplateKey<TTemplates>>(
    params: IgniterMailSendParams<TTemplates, TSelectedTemplate>,
    date: Date,
  ) => Promise<void>;
}
