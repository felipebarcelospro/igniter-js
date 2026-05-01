/**
 * @fileoverview Telemetry events for @igniter-js/collections
 * @module @igniter-js/collections/telemetry
 *
 * @description
 * Defines all telemetry events emitted by the markdown package.
 * These follow the standard attribute naming: `ctx.<domain>.<field>`
 */

import { IgniterTelemetryEvents } from "@igniter-js/telemetry";
import { z } from "zod";

/**
 * Telemetry events for @igniter-js/collections.
 *
 * Events are organized by operation group:
 * - `document`: CRUD operations on documents
 * - `collection`: Collection-level operations
 * - `validation`: Schema validation events
 *
 * @example
 * ```typescript
 * import { IgniterCollectionTelemetryEvents } from '@igniter-js/collections/telemetry';
 * import { IgniterTelemetry } from '@igniter-js/telemetry';
 *
 * const telemetry = IgniterTelemetry.create()
 *   .addEvents(IgniterCollectionTelemetryEvents)
 *   .build();
 * ```
 */
export const IgniterCollectionTelemetryEvents = IgniterTelemetryEvents.namespace(
  "igniter.collections"
)
  // ============================================================================
  // DOCUMENT OPERATIONS
  // ============================================================================
  .group("document", (g) =>
    g
      // Create
      .event(
        "create.started",
        z.object({
          "ctx.collection.collection": z.string(),
          "ctx.collection.document_id": z.string().optional(),
          "ctx.collection.has_content": z.boolean(),
        })
      )
      .event(
        "create.success",
        z.object({
          "ctx.collection.collection": z.string(),
          "ctx.collection.document_id": z.string(),
          "ctx.collection.duration_ms": z.number(),
        })
      )
      .event(
        "create.error",
        z.object({
          "ctx.collection.collection": z.string(),
          "ctx.collection.error.code": z.string(),
          "ctx.collection.error.message": z.string(),
        })
      )

      // Find unique
      .event(
        "findUnique.started",
        z.object({
          "ctx.collection.collection": z.string(),
          "ctx.collection.document_id": z.string(),
        })
      )
      .event(
        "findUnique.success",
        z.object({
          "ctx.collection.collection": z.string(),
          "ctx.collection.document_id": z.string(),
          "ctx.collection.found": z.boolean(),
          "ctx.collection.duration_ms": z.number(),
        })
      )
      .event(
        "findUnique.error",
        z.object({
          "ctx.collection.collection": z.string(),
          "ctx.collection.document_id": z.string(),
          "ctx.collection.error.code": z.string(),
          "ctx.collection.error.message": z.string(),
        })
      )

      // Find many
      .event(
        "findMany.started",
        z.object({
          "ctx.collection.collection": z.string(),
          "ctx.collection.has_filters": z.boolean(),
          "ctx.collection.take": z.number().optional(),
          "ctx.collection.skip": z.number().optional(),
        })
      )
      .event(
        "findMany.success",
        z.object({
          "ctx.collection.collection": z.string(),
          "ctx.collection.count": z.number(),
          "ctx.collection.duration_ms": z.number(),
        })
      )
      .event(
        "findMany.error",
        z.object({
          "ctx.collection.collection": z.string(),
          "ctx.collection.error.code": z.string(),
          "ctx.collection.error.message": z.string(),
        })
      )

      // Update
      .event(
        "update.started",
        z.object({
          "ctx.collection.collection": z.string(),
          "ctx.collection.document_id": z.string(),
        })
      )
      .event(
        "update.success",
        z.object({
          "ctx.collection.collection": z.string(),
          "ctx.collection.document_id": z.string(),
          "ctx.collection.duration_ms": z.number(),
        })
      )
      .event(
        "update.error",
        z.object({
          "ctx.collection.collection": z.string(),
          "ctx.collection.document_id": z.string(),
          "ctx.collection.error.code": z.string(),
          "ctx.collection.error.message": z.string(),
        })
      )

      // Delete
      .event(
        "delete.started",
        z.object({
          "ctx.collection.collection": z.string(),
          "ctx.collection.document_id": z.string(),
        })
      )
      .event(
        "delete.success",
        z.object({
          "ctx.collection.collection": z.string(),
          "ctx.collection.document_id": z.string(),
          "ctx.collection.duration_ms": z.number(),
        })
      )
      .event(
        "delete.error",
        z.object({
          "ctx.collection.collection": z.string(),
          "ctx.collection.document_id": z.string(),
          "ctx.collection.error.code": z.string(),
          "ctx.collection.error.message": z.string(),
        })
      )

      // Count
      .event(
        "count.started",
        z.object({
          "ctx.collection.collection": z.string(),
          "ctx.collection.has_filters": z.boolean(),
        })
      )
      .event(
        "count.success",
        z.object({
          "ctx.collection.collection": z.string(),
          "ctx.collection.count": z.number(),
          "ctx.collection.duration_ms": z.number(),
        })
      )
      .event(
        "count.error",
        z.object({
          "ctx.collection.collection": z.string(),
          "ctx.collection.error.code": z.string(),
          "ctx.collection.error.message": z.string(),
        })
      )
  )

  // ============================================================================
  // COLLECTION OPERATIONS
  // ============================================================================
  .group("collection", (g) =>
    g
      .event(
        "initialized",
        z.object({
          "ctx.collection.collection": z.string(),
          "ctx.collection.base_path": z.string(),
          "ctx.collection.has_schema": z.boolean(),
        })
      )
      .event(
        "list.started",
        z.object({
          "ctx.collection.collection": z.string(),
        })
      )
      .event(
        "list.success",
        z.object({
          "ctx.collection.collection": z.string(),
          "ctx.collection.file_count": z.number(),
          "ctx.collection.duration_ms": z.number(),
        })
      )
  )

  // ============================================================================
  // VALIDATION EVENTS
  // ============================================================================
  .group("validation", (g) =>
    g
      .event(
        "started",
        z.object({
          "ctx.collection.collection": z.string(),
          "ctx.collection.document_id": z.string().optional(),
        })
      )
      .event(
        "success",
        z.object({
          "ctx.collection.collection": z.string(),
          "ctx.collection.document_id": z.string().optional(),
          "ctx.collection.duration_ms": z.number(),
        })
      )
      .event(
        "error",
        z.object({
          "ctx.collection.collection": z.string(),
          "ctx.collection.document_id": z.string().optional(),
          "ctx.collection.issue_count": z.number(),
        })
      )
  )

  // ============================================================================
  // HOOK EVENTS
  // ============================================================================
  .group("hook", (g) =>
    g
      .event(
        "executed",
        z.object({
          "ctx.collection.collection": z.string(),
          "ctx.collection.hook_type": z.string(),
          "ctx.collection.document_id": z.string().optional(),
          "ctx.collection.was_cancelled": z.boolean(),
          "ctx.collection.duration_ms": z.number(),
        })
      )
      .event(
        "cancelled",
        z.object({
          "ctx.collection.collection": z.string(),
          "ctx.collection.hook_type": z.string(),
          "ctx.collection.document_id": z.string().optional(),
        })
      )
  )

  // ============================================================================
  // VIEW OPERATIONS
  // ============================================================================
  .group("view", (g) =>
    g
      .event("render.started", z.object({
        'ctx.collection.name': z.string(),
        'ctx.view.name': z.string(),
        'ctx.has_hook': z.boolean(),
        'ctx.has_stats': z.boolean(),
        'ctx.has_transforms': z.boolean()
      }))
      .event("render.success", z.object({
        'ctx.collection.name': z.string(),
        'ctx.view.name': z.string(),
        'ctx.duration_ms': z.number(),
        'ctx.items.count': z.number(),
        'ctx.stats.count': z.number().optional()
      }))
      .event("render.error", z.object({
        'ctx.collection.name': z.string(),
        'ctx.view.name': z.string(),
        'ctx.error.code': z.string(),
        'ctx.error.message': z.string()
      }))
      .event("stats.calculated", z.object({
        'ctx.collection.name': z.string(),
        'ctx.view.name': z.string(),
        'ctx.stats.count': z.number(),
        'ctx.items.count': z.number(),
        'ctx.duration_ms': z.number()
      }))
      .event("hook.executed", z.object({
        'ctx.collection.name': z.string(),
        'ctx.view.name': z.string(),
        'ctx.hook.type': z.enum(['file', 'inline']),
        'ctx.duration_ms': z.number()
      }))
      .event("action.started", z.object({
        'ctx.collection.name': z.string(),
        'ctx.view.name': z.string(),
        'ctx.action.name': z.string(),
        'ctx.action.params_size': z.number()
      }))
      .event("action.success", z.object({
        'ctx.collection.name': z.string(),
        'ctx.view.name': z.string(),
        'ctx.action.name': z.string(),
        'ctx.action.duration_ms': z.number(),
        'ctx.action.success': z.boolean()
      }))
      .event("action.error", z.object({
        'ctx.collection.name': z.string(),
        'ctx.view.name': z.string(),
        'ctx.action.name': z.string(),
        'ctx.action.duration_ms': z.number(),
        'ctx.error.code': z.string(),
        'ctx.error.message': z.string()
      }))
  )

  .build();

/**
 * Type of the telemetry events for type-safe usage.
 */
export type IgniterCollectionTelemetryEventsType =
  typeof IgniterCollectionTelemetryEvents.$Infer.registry;
