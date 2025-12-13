import type {
  IgniterJobQueueAdapter,
  IgniterLogger,
  JobLimiter,
  JobQueueConfig,
  StandardSchemaV1,
} from '@igniter-js/core'
import type { MailAdapter } from './adapter'
import type { IgniterMailTemplate, MailTemplateKey, MailTemplatePayload } from './templates'

/**
 * Type inference helper exposed by the runtime instance.
 */
export type IgniterMailInfer<TTemplates extends object> = {
  /** Union of valid template keys. */
  readonly Templates: MailTemplateKey<TTemplates>
  /** Payloads by template. */
  readonly Payloads: {
    [K in MailTemplateKey<TTemplates>]: MailTemplatePayload<TTemplates[K]>
  }

  /**
   * Union of valid `mail.send()` inputs.
   * Useful for type-level consumption.
   */
  readonly SendInput: {
    [K in MailTemplateKey<TTemplates>]: IgniterMailSendParams<TTemplates, K>
  }[MailTemplateKey<TTemplates>]

  /**
   * Tuple form of `mail.schedule()` inputs.
   */
  readonly ScheduleInput: [
    {
      [K in MailTemplateKey<TTemplates>]: IgniterMailSendParams<TTemplates, K>
    }[MailTemplateKey<TTemplates>],
    Date,
  ]
}

/**
 * Queue options used when scheduling or enqueuing send jobs.
 */
export type IgniterMailQueueOptions = {
  /** Namespace used to compose the job id (default: "mail"). */
  namespace?: string
  /** Task key used to compose the job id (default: "send"). */
  task?: string
  /** Human-readable job name (default: "send"). */
  name?: string
  /** Queue config for this job. */
  queue?: JobQueueConfig
  /** Number of retry attempts on failure. */
  attempts?: number
  /** Job priority (higher value = higher priority). */
  priority?: number
  /** Remove job after completion. */
  removeOnComplete?: boolean | number
  /** Remove job after failure. */
  removeOnFail?: boolean | number
  /** Additional metadata. */
  metadata?: Record<string, any>
  /** Optional rate limiter config. */
  limiter?: JobLimiter
}

/**
 * Normalized queue configuration consumed by the runtime.
 */
export type IgniterMailQueueConfig = {
  /** Queue adapter instance. */
  adapter: IgniterJobQueueAdapter<any>
  /** Fully qualified job id. */
  id: string
  /** Optional queue options. */
  options?: IgniterMailQueueOptions
}

/**
 * Parameters required to send an email using a template.
 */
export interface IgniterMailSendParams<
  TTemplates extends object,
  TSelectedTemplate extends MailTemplateKey<TTemplates>,
> {
  /** Recipient email address. */
  to: string
  /** Optional subject override. */
  subject?: string
  /** Template key. */
  template: TSelectedTemplate
  /** Template payload (validated using StandardSchema when provided). */
  data: MailTemplatePayload<TTemplates[TSelectedTemplate]>
}

/**
 * Hooks invoked by the runtime.
 */
export interface IgniterMailHooks<TTemplates extends object> {
  /** Invoked before rendering/sending. */
  onSendStarted?: (params: IgniterMailSendParams<TTemplates, any>) => Promise<void>
  /** Invoked when sending fails. */
  onSendError?: (
    params: IgniterMailSendParams<TTemplates, any>,
    error: Error,
  ) => Promise<void>
  /** Invoked after a successful send. */
  onSendSuccess?: (params: IgniterMailSendParams<TTemplates, any>) => Promise<void>
}

/**
 * Options used to initialize {@link IgniterMail}.
 */
export interface IgniterMailOptions<
  TTemplates extends object = Record<string, IgniterMailTemplate<any>>,
> extends IgniterMailHooks<TTemplates> {
  /** Default FROM address used by the adapter. */
  from: string
  /** Adapter implementation. */
  adapter: MailAdapter
  /** Template registry. */
  templates: TTemplates

  /** Optional logger used for debug/info/error logging. */
  logger?: IgniterLogger
  /** Optional queue configuration for asynchronous delivery. */
  queue?: IgniterMailQueueConfig
}

/**
 * Legacy initializer options.
 *
 * Kept for backwards compatibility with older integrations.
 */
export interface LegacyIgniterMailOptions<
  TTemplates extends object = Record<string, IgniterMailTemplate<any>>,
> extends IgniterMailHooks<TTemplates> {
  /** Provider secret/token. */
  secret: string
  /** Default FROM address. */
  from: string
  /** Adapter factory. */
  adapter: (options: LegacyIgniterMailOptions<any>) => MailAdapter
  /** Template registry. */
  templates: TTemplates
}

/**
 * Public interface implemented by {@link IgniterMail}.
 */
export interface IIgniterMail<TTemplates extends object> {
  /**
   * Type inference helper.
   * Access via `typeof mail.$Infer` (type-level only).
   */
  readonly $Infer: IgniterMailInfer<TTemplates>

  /** Sends an email immediately. */
  send: <TSelectedTemplate extends MailTemplateKey<TTemplates>>(
    params: IgniterMailSendParams<TTemplates, TSelectedTemplate>,
  ) => Promise<void>

  /** Schedules an email for a future date (queue if configured, otherwise setTimeout). */
  schedule: <TSelectedTemplate extends MailTemplateKey<TTemplates>>(
    params: IgniterMailSendParams<TTemplates, TSelectedTemplate>,
    date: Date,
  ) => Promise<void>
}

/**
 * Helper for creating a passthrough `StandardSchemaV1` validator.
 */
export function createPassthroughSchema(): StandardSchemaV1 {
  return {
    '~standard': {
      vendor: '@igniter-js/mail',
      version: 1,
      validate: async (value: unknown) => ({ value }),
    },
  } satisfies StandardSchemaV1
}
