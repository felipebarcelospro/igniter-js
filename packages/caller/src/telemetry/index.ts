/**
 * @fileoverview Telemetry events for @igniter-js/caller
 * @module @igniter-js/caller/telemetry
 *
 * @description
 * Defines all telemetry events for request execution, caching, retry, and validation.
 * Events follow the `igniter.caller.<group>.<event>` convention.
 */

import { IgniterTelemetryEvents } from "@igniter-js/telemetry";
import { z } from "zod";

/**
 * Base attributes for request-level telemetry.
 */
const RequestBaseSchema = z.object({
  "ctx.request.method": z.string(),
  "ctx.request.url": z.string(),
  "ctx.request.baseUrl": z.string().optional(),
  "ctx.request.timeoutMs": z.number().optional(),
});

/**
 * Attributes for successful request completion.
 */
const RequestSuccessSchema = RequestBaseSchema.extend({
  "ctx.request.durationMs": z.number(),
  "ctx.response.status": z.number().optional(),
  "ctx.response.contentType": z.string().optional(),
  "ctx.cache.hit": z.boolean().optional(),
  "ctx.request.fallback": z.boolean().optional(),
});

/**
 * Attributes for failed request completion.
 */
const RequestErrorSchema = RequestBaseSchema.extend({
  "ctx.request.durationMs": z.number().optional(),
  "ctx.response.status": z.number().optional(),
  "ctx.error.code": z.string(),
  "ctx.error.message": z.string(),
});

/**
 * Attributes for cache hits.
 */
const CacheHitSchema = RequestBaseSchema.extend({
  "ctx.cache.key": z.string(),
  "ctx.cache.staleTime": z.number().optional(),
});

/**
 * Attributes for retry attempts.
 */
const RetryAttemptSchema = RequestBaseSchema.extend({
  "ctx.retry.attempt": z.number(),
  "ctx.retry.maxAttempts": z.number(),
  "ctx.retry.delayMs": z.number(),
});

/**
 * Attributes for validation errors.
 */
const ValidationErrorSchema = RequestBaseSchema.extend({
  "ctx.validation.type": z.enum(["request", "response"]),
  "ctx.validation.error": z.string(),
  "ctx.response.status": z.number().optional(),
});

/**
 * Telemetry events registry for `@igniter-js/caller`.
 */
export const IgniterCallerTelemetryEvents = IgniterTelemetryEvents.namespace(
  "igniter.caller",
)
  // ============================================================================
  // REQUEST EVENTS
  // ============================================================================
  .group("request", (g) =>
    g
      .event("execute.started", RequestBaseSchema)
      .event("execute.success", RequestSuccessSchema)
      .event("execute.error", RequestErrorSchema)
      .event("timeout.error", RequestBaseSchema.extend({
        "ctx.request.timeoutMs": z.number(),
      })),
  )
  // ============================================================================
  // CACHE EVENTS
  // ============================================================================
  .group("cache", (g) => g.event("read.hit", CacheHitSchema))
  // ============================================================================
  // RETRY EVENTS
  // ============================================================================
  .group("retry", (g) => g.event("attempt.started", RetryAttemptSchema))
  // ============================================================================
  // VALIDATION EVENTS
  // ============================================================================
  .group("validation", (g) =>
    g
      .event("request.error", ValidationErrorSchema)
      .event("response.error", ValidationErrorSchema),
  )
  .build();

/**
 * Inferred attribute types for `IgniterCallerTelemetryEvents`.
 */
export type IgniterCallerTelemetryEventsType =
  typeof IgniterCallerTelemetryEvents.$Infer;
