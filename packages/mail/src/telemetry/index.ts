/**
 * @fileoverview Telemetry events for @igniter-js/mail
 * @module @igniter-js/mail/telemetry
 */

import { IgniterTelemetryEvents } from '@igniter-js/telemetry'
import { z } from 'zod'

/**
 * Telemetry namespace for mail.
 * All events are prefixed with `igniter.mail.`
 */
const TELEMETRY_NAMESPACE = 'igniter.mail'

/**
 * Telemetry event definitions for `@igniter-js/mail`.
 */
export const IgniterMailTelemetryEvents = IgniterTelemetryEvents.namespace(
  TELEMETRY_NAMESPACE,
)
  .group('send', (g) =>
    g
      .event(
        'started',
        z.object({
          'mail.to': z.string(),
          'mail.template': z.string(),
          'mail.subject': z.string().optional(),
        }),
      )
      .event(
        'success',
        z.object({
          'mail.to': z.string(),
          'mail.template': z.string(),
          'mail.subject': z.string().optional(),
          'mail.duration_ms': z.number().optional(),
        }),
      )
      .event(
        'error',
        z.object({
          'mail.to': z.string(),
          'mail.template': z.string(),
          'mail.subject': z.string().optional(),
          'mail.error.code': z.string(),
          'mail.error.message': z.string(),
          'mail.duration_ms': z.number().optional(),
        }),
      ),
  )
  .group('schedule', (g) =>
    g
      .event(
        'started',
        z.object({
          'mail.to': z.string(),
          'mail.template': z.string(),
          'mail.scheduled_at': z.string(),
          'mail.delay_ms': z.number(),
        }),
      )
      .event(
        'success',
        z.object({
          'mail.to': z.string(),
          'mail.template': z.string(),
          'mail.scheduled_at': z.string(),
          'mail.delay_ms': z.number(),
          'mail.queue_id': z.string().optional(),
        }),
      )
      .event(
        'error',
        z.object({
          'mail.to': z.string(),
          'mail.template': z.string(),
          'mail.scheduled_at': z.string(),
          'mail.error.code': z.string(),
          'mail.error.message': z.string(),
        }),
      ),
  )
  .build()

export type IgniterMailTelemetryEventsType =
  typeof IgniterMailTelemetryEvents.$Infer

export type IgniterMailTelemetryEvents = typeof IgniterMailTelemetryEvents
