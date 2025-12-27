/**
 * @fileoverview Telemetry events for @igniter-js/store
 * @module @igniter-js/store/telemetry
 *
 * @description
 * Defines telemetry events for store operations including key-value,
 * counter, batch, claim, events (pub/sub), streams, and dev tools. Events use
 * dot notation namespacing and follow the IgniterTelemetry pattern.
 *
 * ### Important Redaction Rules
 *
 * **NEVER** expose these fields in telemetry attributes:
 * - Actual key values or data stored (may contain PII)
 * - Message payloads from pub/sub (may contain sensitive data)
 * - User identifiers or personal information
 *
 * **SAFE** to expose:
 * - Operation names (get, set, delete, etc.)
 * - Key patterns (without actual values)
 * - TTL values
 * - Success/failure states
 * - Error codes and sanitized messages
 * - Timing/duration metrics
 * - Scope types (not actual scope identifiers)
 *
 * @example
 * ```typescript
 * import { IgniterStoreTelemetryEvents } from '@igniter-js/store/telemetry'
 * import { IgniterTelemetry } from '@igniter-js/telemetry'
 *
 * const telemetry = IgniterTelemetry.create()
 *   .withService('my-api')
 *   .addEvents(IgniterStoreTelemetryEvents)
 *   .withRedaction({
 *     denylistKeys: ['value', 'message', 'payload', 'data'],
 *     hashKeys: ['ctx.store.key'],
 *   })
 *   .build()
 *
 * const store = IgniterStore.create()
 *   .withAdapter(adapter)
 *   .withService('my-api')
 *   .withTelemetry(telemetry)
 *   .build()
 * ```
 */

import { IgniterTelemetryEvents } from "@igniter-js/telemetry";
import { z } from "zod";

/**
 * Base attributes present in all store events.
 * These are safe to expose and provide operational context.
 */
const BaseStoreAttributesSchema = z.object({
  /**
   * The service name configured for the store.
   */
  "ctx.store.service": z.string(),

  /**
   * The key namespace (kv, counter, claim, events, stream, dev).
   */
  "ctx.store.namespace": z.string().optional(),

  /**
   * The scope key (never include identifiers).
   */
  "ctx.store.scope_key": z.string().optional(),

  /**
   * Depth of the scope chain.
   */
  "ctx.store.scope_depth": z.number().optional(),
});

/**
 * Attributes for key-value operations.
 */
const KVAttributesSchema = BaseStoreAttributesSchema.extend({
  /**
   * Whether the operation found a value (for get operations).
   */
  "ctx.kv.found": z.boolean().optional(),

  /**
   * The TTL set for the key (in seconds).
   */
  "ctx.kv.ttl": z.number().optional(),

  /**
   * Whether the key existed before the operation.
   */
  "ctx.kv.existed": z.boolean().optional(),
});

/**
 * Attributes for counter operations.
 */
const CounterAttributesSchema = BaseStoreAttributesSchema.extend({
  /**
   * The new value after increment/decrement.
   */
  "ctx.counter.value": z.number().optional(),

  /**
   * The amount incremented/decremented.
   */
  "ctx.counter.delta": z.number().optional(),

  /**
   * The TTL set for the counter (in seconds).
   */
  "ctx.counter.ttl": z.number().optional(),
});

/**
 * Attributes for batch operations.
 */
const BatchAttributesSchema = BaseStoreAttributesSchema.extend({
  /**
   * The number of keys in the batch operation.
   */
  "ctx.batch.count": z.number(),

  /**
   * The number of keys found (for get operations).
   */
  "ctx.batch.found": z.number().optional(),
});

/**
 * Attributes for claim (distributed lock) operations.
 */
const ClaimAttributesSchema = BaseStoreAttributesSchema.extend({
  /**
   * Whether the claim was successfully acquired.
   */
  "ctx.claim.acquired": z.boolean().optional(),

  /**
   * The TTL for the claim (in seconds).
   */
  "ctx.claim.ttl": z.number().optional(),
});

/**
 * Attributes for pub/sub operations.
 */
const EventsAttributesSchema = BaseStoreAttributesSchema.extend({
  /**
   * The event channel name (without sensitive data).
   */
  "ctx.events.channel": z.string().optional(),

  /**
   * Whether it's a wildcard subscription.
   */
  "ctx.events.wildcard": z.boolean().optional(),
});

/**
 * Attributes for stream operations.
 */
const StreamAttributesSchema = BaseStoreAttributesSchema.extend({
  /**
   * The stream name.
   */
  "ctx.stream.name": z.string().optional(),

  /**
   * The consumer group name.
   */
  "ctx.stream.group": z.string().optional(),

  /**
   * The consumer name.
   */
  "ctx.stream.consumer": z.string().optional(),

  /**
   * The number of messages in the operation.
   */
  "ctx.stream.count": z.number().optional(),
});

/**
 * Attributes for dev tools operations.
 */
const DevAttributesSchema = BaseStoreAttributesSchema;

/**
 * Attributes for error events.
 */
const ErrorAttributesSchema = BaseStoreAttributesSchema.extend({
  /**
   * The error code.
   */
  "ctx.error.code": z.string(),

  /**
   * The sanitized error message (no sensitive data).
   */
  "ctx.error.message": z.string().optional(),

  /**
   * The operation that failed.
   */
  "ctx.error.operation": z.string().optional(),
});

/**
 * Telemetry events for @igniter-js/store.
 *
 * ### Event Naming Convention
 * All events are prefixed with 'igniter.store' followed by:
 * - `kv.*` - Key-value operations
 * - `counter.*` - Counter operations
 * - `batch.*` - Batch operations
 * - `claim.*` - Distributed lock operations
 * - `events.*` - Pub/sub operations
 * - `stream.*` - Stream operations
 * - `error.*` - Error events
 *
 * ### Usage with IgniterStore
 *
 * These events are automatically emitted when you use `withTelemetry()`:
 *
 * ```typescript
 * import { IgniterStore } from '@igniter-js/store'
 * import { IgniterTelemetry } from '@igniter-js/telemetry'
 * import { IgniterStoreTelemetryEvents } from '@igniter-js/store/telemetry'
 *
 * const telemetry = IgniterTelemetry.create()
 *   .withService('my-api')
 *   .addEvents(IgniterStoreTelemetryEvents)
 *   .build()
 *
 * const store = IgniterStore.create()
 *   .withAdapter(adapter)
 *   .withService('my-api')
 *   .withTelemetry(telemetry)
 *   .build()
 * ```
 */
export const IgniterStoreTelemetryEvents = IgniterTelemetryEvents.namespace(
  "igniter.store",
)
  // ============================================================================
  // KEY-VALUE EVENTS
  // ============================================================================
  .group("kv", (g) =>
    g
      .event("get.started", KVAttributesSchema)
      .event("get.success", KVAttributesSchema)
      .event("get.error", ErrorAttributesSchema)
      .event("set.started", KVAttributesSchema)
      .event("set.success", KVAttributesSchema)
      .event("set.error", ErrorAttributesSchema)
      .event("remove.started", KVAttributesSchema)
      .event("remove.success", KVAttributesSchema)
      .event("remove.error", ErrorAttributesSchema)
      .event("exists.started", KVAttributesSchema)
      .event("exists.success", KVAttributesSchema)
      .event("exists.error", ErrorAttributesSchema)
      .event("expire.started", KVAttributesSchema)
      .event("expire.success", KVAttributesSchema)
      .event("expire.error", ErrorAttributesSchema)
      .event("touch.started", KVAttributesSchema)
      .event("touch.success", KVAttributesSchema)
      .event("touch.error", ErrorAttributesSchema)
  )
  // ============================================================================
  // COUNTER EVENTS
  // ============================================================================
  .group("counter", (g) =>
    g
      .event("increment.started", CounterAttributesSchema)
      .event("increment.success", CounterAttributesSchema)
      .event("increment.error", ErrorAttributesSchema)
      .event("decrement.started", CounterAttributesSchema)
      .event("decrement.success", CounterAttributesSchema)
      .event("decrement.error", ErrorAttributesSchema)
      .event("expire.started", CounterAttributesSchema)
      .event("expire.success", CounterAttributesSchema)
      .event("expire.error", ErrorAttributesSchema)
  )
  // ============================================================================
  // BATCH EVENTS
  // ============================================================================
  .group("batch", (g) =>
    g
      .event("get.started", BatchAttributesSchema)
      .event("get.success", BatchAttributesSchema)
      .event("get.error", ErrorAttributesSchema)
      .event("set.started", BatchAttributesSchema)
      .event("set.success", BatchAttributesSchema)
      .event("set.error", ErrorAttributesSchema)
  )
  // ============================================================================
  // CLAIM EVENTS
  // ============================================================================
  .group("claim", (g) =>
    g
      .event("acquire.started", ClaimAttributesSchema)
      .event("acquire.success", ClaimAttributesSchema)
      .event("acquire.error", ErrorAttributesSchema)
  )
  // ============================================================================
  // PUB/SUB EVENTS
  // ============================================================================
  .group("events", (g) =>
    g
      .event("publish.started", EventsAttributesSchema)
      .event("publish.success", EventsAttributesSchema)
      .event("publish.error", ErrorAttributesSchema)
      .event("subscribe.started", EventsAttributesSchema)
      .event("subscribe.success", EventsAttributesSchema)
      .event("subscribe.error", ErrorAttributesSchema)
      .event("unsubscribe.started", EventsAttributesSchema)
      .event("unsubscribe.success", EventsAttributesSchema)
      .event("unsubscribe.error", ErrorAttributesSchema)
  )
  // ============================================================================
  // STREAM EVENTS
  // ============================================================================
  .group("stream", (g) =>
    g
      .event("append.started", StreamAttributesSchema)
      .event("append.success", StreamAttributesSchema)
      .event("append.error", ErrorAttributesSchema)
      .event("read.started", StreamAttributesSchema)
      .event("read.success", StreamAttributesSchema)
      .event("read.error", ErrorAttributesSchema)
      .event("ack.started", StreamAttributesSchema)
      .event("ack.success", StreamAttributesSchema)
      .event("ack.error", ErrorAttributesSchema)
      .event("group.started", StreamAttributesSchema)
      .event("group.success", StreamAttributesSchema)
      .event("group.error", ErrorAttributesSchema)
  )
  // ============================================================================
  // DEV EVENTS
  // ============================================================================
  .group("dev", (g) =>
    g
      .event("scan.started", DevAttributesSchema)
      .event("scan.success", DevAttributesSchema)
      .event("scan.error", ErrorAttributesSchema)
  )
  .build();

/**
 * Type for the telemetry events registry.
 */
export type IgniterStoreTelemetryEvents = typeof IgniterStoreTelemetryEvents.$Infer.registry;