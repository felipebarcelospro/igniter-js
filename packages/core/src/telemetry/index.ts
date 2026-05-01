/**
 * @fileoverview Telemetry events for @igniter-js/core
 * @module @igniter-js/core/telemetry
 *
 * @description
 * Defines telemetry events for the Igniter Core request pipeline and runtime.
 * All events follow `igniter.core.<domain>.<event>` naming.
 *
 * ### PII Safety
 * Never emit raw IPs, user agents, request bodies, or auth tokens.
 * Use counts, booleans, or high-level descriptors only.
 */

import { IgniterTelemetryEvents } from "@igniter-js/telemetry";
import { z } from "zod";

// ============================================================================
// BASE SCHEMAS
// ============================================================================

const CoreBaseAttributesSchema = z.object({
  "ctx.core.service": z.string().optional(),
  "ctx.core.environment": z.string().optional(),
});

const ErrorFieldsSchema = z.object({
  "ctx.error.type": z.enum([
    "validation",
    "igniter",
    "generic",
    "initialization",
    "runtime",
  ]),
  "ctx.error.code": z.string(),
  "ctx.error.message": z.string().optional(),
  "ctx.error.status_code": z.number().optional(),
  "ctx.error.component": z.string().optional(),
});

// ============================================================================
// HTTP REQUEST
// ============================================================================

const HttpRequestBaseSchema = CoreBaseAttributesSchema.extend({
  "ctx.http.method": z.string(),
  "ctx.http.path_key": z.string().optional(),
  "ctx.http.path_depth": z.number().optional(),
  "ctx.http.query_count": z.number().optional(),
  "ctx.http.headers_count": z.number().optional(),
  "ctx.http.has_body": z.boolean().optional(),
  "ctx.http.is_sse": z.boolean().optional(),
  "ctx.device.type": z.string().optional(),
  "ctx.device.browser": z.string().optional(),
  "ctx.device.os": z.string().optional(),
  "ctx.geo.country": z.string().optional(),
});

const HttpRequestSuccessSchema = HttpRequestBaseSchema.extend({
  "ctx.http.status_code": z.number(),
  "ctx.http.duration_ms": z.number(),
  "ctx.response.type": z.enum([
    "json",
    "error",
    "stream",
    "no_content",
    "raw",
  ]),
});

const HttpRequestErrorSchema = HttpRequestBaseSchema.extend({
  "ctx.http.status_code": z.number().optional(),
  "ctx.http.duration_ms": z.number().optional(),
}).extend(ErrorFieldsSchema.shape);

// ============================================================================
// ROUTE RESOLUTION
// ============================================================================

const RouteResolveBaseSchema = CoreBaseAttributesSchema.extend({
  "ctx.route.method": z.string(),
  "ctx.route.path_depth": z.number().optional(),
});

const RouteResolveSuccessSchema = RouteResolveBaseSchema.extend({
  "ctx.route.path_key": z.string(),
  "ctx.route.params_count": z.number(),
  "ctx.route.duration_ms": z.number(),
});

const RouteResolveNotFoundSchema = RouteResolveBaseSchema.extend({
  "ctx.route.duration_ms": z.number(),
});

const RouteResolveErrorSchema = RouteResolveBaseSchema.extend({
  "ctx.route.duration_ms": z.number(),
}).extend(ErrorFieldsSchema.shape);

// ============================================================================
// BODY PARSING
// ============================================================================

const BodyParseBaseSchema = CoreBaseAttributesSchema.extend({
  "ctx.body.content_type": z.string(),
  "ctx.body.has_schema": z.boolean(),
});

const BodyParseSuccessSchema = BodyParseBaseSchema.extend({
  "ctx.body.size_bytes": z.number(),
  "ctx.body.duration_ms": z.number(),
});

const BodyParseErrorSchema = BodyParseBaseSchema.extend({
  "ctx.body.size_bytes": z.number().optional(),
  "ctx.body.duration_ms": z.number(),
}).extend(ErrorFieldsSchema.shape);

// ============================================================================
// CONTEXT BUILD + ENHANCEMENT
// ============================================================================

const ContextBuildStartedSchema = CoreBaseAttributesSchema.extend({
  "ctx.context.has_body_schema": z.boolean(),
});

const ContextBuildSuccessSchema = CoreBaseAttributesSchema.extend({
  "ctx.context.has_plugins": z.boolean(),
  "ctx.context.plugin_count": z.number(),
  "ctx.context.duration_ms": z.number(),
  "ctx.context.has_device": z.boolean().optional(),
  "ctx.context.has_geo": z.boolean().optional(),
});

const ContextBuildErrorSchema = CoreBaseAttributesSchema.extend({
  "ctx.context.duration_ms": z.number(),
}).extend(ErrorFieldsSchema.shape);

const ContextEnhanceStartedSchema = CoreBaseAttributesSchema.extend({
  "ctx.context.plugin_count": z.number(),
  "ctx.context.has_plugin_manager": z.boolean(),
});

const ContextEnhanceSuccessSchema = CoreBaseAttributesSchema.extend({
  "ctx.context.injected_count": z.number(),
  "ctx.context.duration_ms": z.number(),
});

const ContextEnhanceErrorSchema = CoreBaseAttributesSchema.extend({
  "ctx.context.duration_ms": z.number(),
}).extend(ErrorFieldsSchema.shape);

// ============================================================================
// MIDDLEWARE
// ============================================================================

const MiddlewareBaseSchema = CoreBaseAttributesSchema.extend({
  "ctx.middleware.name": z.string(),
  "ctx.middleware.type": z.enum(["global", "action"]),
  "ctx.middleware.index": z.number(),
});

const MiddlewareSuccessSchema = MiddlewareBaseSchema.extend({
  "ctx.middleware.duration_ms": z.number(),
});

const MiddlewareEarlyReturnSchema = MiddlewareBaseSchema.extend({
  "ctx.middleware.duration_ms": z.number(),
  "ctx.response.type": z.string().optional(),
  "ctx.response.status_code": z.number().optional(),
});

const MiddlewareErrorSchema = MiddlewareBaseSchema.extend({
  "ctx.middleware.duration_ms": z.number(),
}).extend(ErrorFieldsSchema.shape);

// ============================================================================
// VALIDATION
// ============================================================================

const ValidationBaseSchema = CoreBaseAttributesSchema.extend({
  "ctx.validation.type": z.enum(["body", "query", "params"]),
});

const ValidationSuccessSchema = ValidationBaseSchema.extend({
  "ctx.validation.errors_count": z.number(),
});

const ValidationErrorSchema = ValidationBaseSchema.extend({
  "ctx.validation.errors_count": z.number(),
}).extend(ErrorFieldsSchema.shape);

// ============================================================================
// ACTION EXECUTION
// ============================================================================

const ActionExecuteBaseSchema = CoreBaseAttributesSchema.extend({
  "ctx.action.path_key": z.string(),
  "ctx.action.method": z.string(),
  "ctx.action.type": z.enum(["query", "mutation"]),
  "ctx.action.has_body": z.boolean(),
  "ctx.action.has_query": z.boolean(),
  "ctx.action.middleware_count": z.number(),
});

const ActionExecuteSuccessSchema = ActionExecuteBaseSchema.extend({
  "ctx.action.duration_ms": z.number(),
});

const ActionExecuteErrorSchema = ActionExecuteBaseSchema.extend({
  "ctx.action.duration_ms": z.number(),
}).extend(ErrorFieldsSchema.shape);

// ============================================================================
// RESPONSE PROCESSING
// ============================================================================

const ResponseBuildBaseSchema = CoreBaseAttributesSchema.extend({
  "ctx.response.type": z.enum(["json", "error", "stream", "no_content", "raw"]),
});

const ResponseBuildSuccessSchema = ResponseBuildBaseSchema.extend({
  "ctx.response.status_code": z.number(),
  "ctx.response.size_bytes": z.number(),
  "ctx.response.duration_ms": z.number(),
});

const ResponseBuildErrorSchema = ResponseBuildBaseSchema.extend({
  "ctx.response.duration_ms": z.number(),
}).extend(ErrorFieldsSchema.shape);

const ResponseStreamCreatedSchema = CoreBaseAttributesSchema.extend({
  "ctx.response.channel_id": z.string().optional(),
  "ctx.response.controller": z.string().optional(),
  "ctx.response.action": z.string().optional(),
});

// ============================================================================
// CACHE + REVALIDATE
// ============================================================================

const CacheSetBaseSchema = CoreBaseAttributesSchema.extend({
  "ctx.cache.policy": z.enum(["public", "private", "no-store"]),
  "ctx.cache.ttl": z.number().optional(),
  "ctx.cache.tags_count": z.number().optional(),
  "ctx.cache.key_resolved": z.boolean(),
});

const CacheInvalidateBaseSchema = CoreBaseAttributesSchema.extend({
  "ctx.cache.keys_count": z.number(),
  "ctx.cache.tags_count": z.number().optional(),
});

const CacheResolveFailedSchema = CoreBaseAttributesSchema.extend({
  "ctx.cache.policy": z.string(),
  "ctx.cache.key_resolved": z.boolean(),
});

const RevalidateBaseSchema = CoreBaseAttributesSchema.extend({
  "ctx.revalidate.paths_count": z.number(),
  "ctx.revalidate.scopes_count": z.number(),
  "ctx.revalidate.has_data": z.boolean(),
  "ctx.revalidate.cache_invalidate": z.boolean(),
});

const RevalidatePublishedSchema = CoreBaseAttributesSchema.extend({
  "ctx.revalidate.paths_count": z.number(),
  "ctx.revalidate.scopes_count": z.number(),
});

const RevalidateErrorSchema = CoreBaseAttributesSchema.extend({
  "ctx.revalidate.paths_count": z.number().optional(),
  "ctx.revalidate.scopes_count": z.number().optional(),
}).extend(ErrorFieldsSchema.shape);

// ============================================================================
// REALTIME / SSE
// ============================================================================

const RealtimeConnectionBaseSchema = CoreBaseAttributesSchema.extend({
  "ctx.realtime.transport": z.string(),
  "ctx.realtime.channels_count": z.number(),
  "ctx.realtime.scopes_count": z.number(),
});

const RealtimeSubscribeBaseSchema = CoreBaseAttributesSchema.extend({
  "ctx.realtime.event": z.string(),
  "ctx.realtime.scopes_count": z.number(),
});

const RealtimeKeepAliveSchema = CoreBaseAttributesSchema.extend({
  "ctx.realtime.transport": z.string(),
});

const RealtimeEventDeliverSchema = CoreBaseAttributesSchema.extend({
  "ctx.realtime.event": z.string(),
  "ctx.realtime.recipients_count": z.number(),
});

// ============================================================================
// GLOBAL ERROR
// ============================================================================

const ErrorTrackedSchema = CoreBaseAttributesSchema.extend({
  "ctx.http.method": z.string().optional(),
  "ctx.http.path_key": z.string().optional(),
}).extend(ErrorFieldsSchema.shape);

// ============================================================================
// EVENTS REGISTRY
// ============================================================================

export const IgniterCoreTelemetryEvents = IgniterTelemetryEvents.namespace(
  "igniter.core",
)
  // ==========================================================================
  // HTTP REQUEST
  // ==========================================================================
  .event("http.request.started", HttpRequestBaseSchema)
  .event("http.request.success", HttpRequestSuccessSchema)
  .event("http.request.error", HttpRequestErrorSchema)
  // ==========================================================================
  // ROUTE RESOLUTION
  // ==========================================================================
  .event("route.resolve.started", RouteResolveBaseSchema)
  .event("route.resolve.success", RouteResolveSuccessSchema)
  .event("route.resolve.not_found", RouteResolveNotFoundSchema)
  .event("route.resolve.error", RouteResolveErrorSchema)
  // ==========================================================================
  // BODY PARSING
  // ==========================================================================
  .event("body.parse.started", BodyParseBaseSchema)
  .event("body.parse.success", BodyParseSuccessSchema)
  .event("body.parse.error", BodyParseErrorSchema)
  // ==========================================================================
  // CONTEXT BUILD + ENHANCEMENT
  // ==========================================================================
  .event("context.build.started", ContextBuildStartedSchema)
  .event("context.build.success", ContextBuildSuccessSchema)
  .event("context.build.error", ContextBuildErrorSchema)
  .event("context.enhance.started", ContextEnhanceStartedSchema)
  .event("context.enhance.success", ContextEnhanceSuccessSchema)
  .event("context.enhance.error", ContextEnhanceErrorSchema)
  // ==========================================================================
  // MIDDLEWARE
  // ==========================================================================
  .event("middleware.execute.started", MiddlewareBaseSchema)
  .event("middleware.execute.success", MiddlewareSuccessSchema)
  .event("middleware.execute.early_return", MiddlewareEarlyReturnSchema)
  .event("middleware.execute.error", MiddlewareErrorSchema)
  // ==========================================================================
  // VALIDATION
  // ==========================================================================
  .event("validation.started", ValidationBaseSchema)
  .event("validation.success", ValidationSuccessSchema)
  .event("validation.error", ValidationErrorSchema)
  // ==========================================================================
  // ACTION EXECUTION
  // ==========================================================================
  .event("action.execute.started", ActionExecuteBaseSchema)
  .event("action.execute.success", ActionExecuteSuccessSchema)
  .event("action.execute.error", ActionExecuteErrorSchema)
  // ==========================================================================
  // RESPONSE
  // ==========================================================================
  .event("response.build.started", ResponseBuildBaseSchema)
  .event("response.build.success", ResponseBuildSuccessSchema)
  .event("response.build.error", ResponseBuildErrorSchema)
  .event("response.stream.created", ResponseStreamCreatedSchema)
  // ==========================================================================
  // CACHE + REVALIDATE
  // ==========================================================================
  .event("cache.set.started", CacheSetBaseSchema)
  .event("cache.set.success", CacheSetBaseSchema)
  .event("cache.set.error", CacheSetBaseSchema.extend(ErrorFieldsSchema.shape))
  .event("cache.invalidate.started", CacheInvalidateBaseSchema)
  .event("cache.invalidate.success", CacheInvalidateBaseSchema)
  .event(
    "cache.invalidate.error",
    CacheInvalidateBaseSchema.extend(ErrorFieldsSchema.shape),
  )
  .event("cache.key.resolve_failed", CacheResolveFailedSchema)
  .event("revalidate.requested", RevalidateBaseSchema)
  .event("revalidate.published", RevalidatePublishedSchema)
  .event("revalidate.error", RevalidateErrorSchema)
  // ==========================================================================
  // REALTIME / SSE
  // ==========================================================================
  .event("realtime.connection.open.started", RealtimeConnectionBaseSchema)
  .event("realtime.connection.open.success", RealtimeConnectionBaseSchema)
  .event(
    "realtime.connection.open.error",
    RealtimeConnectionBaseSchema.extend(ErrorFieldsSchema.shape),
  )
  .event("realtime.connection.close.started", RealtimeConnectionBaseSchema)
  .event("realtime.connection.close.success", RealtimeConnectionBaseSchema)
  .event(
    "realtime.connection.close.error",
    RealtimeConnectionBaseSchema.extend(ErrorFieldsSchema.shape),
  )
  .event("realtime.connection.keepalive", RealtimeKeepAliveSchema)
  .event("realtime.subscribe.started", RealtimeSubscribeBaseSchema)
  .event("realtime.subscribe.success", RealtimeSubscribeBaseSchema)
  .event(
    "realtime.subscribe.error",
    RealtimeSubscribeBaseSchema.extend(ErrorFieldsSchema.shape),
  )
  .event("realtime.unsubscribe.started", RealtimeSubscribeBaseSchema)
  .event("realtime.unsubscribe.success", RealtimeSubscribeBaseSchema)
  .event(
    "realtime.unsubscribe.error",
    RealtimeSubscribeBaseSchema.extend(ErrorFieldsSchema.shape),
  )
  .event("realtime.event.publish.started", RealtimeSubscribeBaseSchema)
  .event("realtime.event.publish.success", RealtimeSubscribeBaseSchema)
  .event(
    "realtime.event.publish.error",
    RealtimeSubscribeBaseSchema.extend(ErrorFieldsSchema.shape),
  )
  .event("realtime.event.deliver.success", RealtimeEventDeliverSchema)
  // ==========================================================================
  // GLOBAL ERROR
  // ==========================================================================
  .event("error.tracked", ErrorTrackedSchema)
  .build();

export type IgniterCoreTelemetryEvents =
  typeof IgniterCoreTelemetryEvents.$Infer.registry;
