/**
 * @fileoverview Telemetry events for @igniter-js/storage
 * @module @igniter-js/storage/telemetry
 */

import { IgniterTelemetryEvents } from "@igniter-js/telemetry";
import { z } from "zod";

/**
 * Telemetry namespace for storage.
 * All events will be prefixed with "igniter.storage.".
 */
const TELEMETRY_NAMESPACE = "igniter.storage";

/**
 * Base attributes for upload operations.
 */
const UploadBaseSchema = z.object({
  "storage.path": z.string(),
  "storage.size": z.number().optional(),
  "storage.content_type": z.string().optional(),
  "storage.method": z.enum(["file", "url", "buffer", "base64"]).optional(),
});

/**
 * Base attributes for path-based operations.
 */
const PathSchema = z.object({
  "storage.path": z.string(),
});

/**
 * Base attributes for copy/move operations.
 */
const TransferSchema = z.object({
  "storage.from": z.string(),
  "storage.to": z.string(),
});

/**
 * Base attributes for list operations.
 */
const ListSchema = z.object({
  "storage.prefix": z.string().optional(),
});

/**
 * Telemetry event definitions for `@igniter-js/storage`.
 */
export const IgniterStorageTelemetryEvents = IgniterTelemetryEvents.namespace(
  TELEMETRY_NAMESPACE,
)
  // ==========================================================================
  // UPLOAD EVENTS
  // ==========================================================================
  .group("upload", (g) =>
    g
      .event("started", UploadBaseSchema)
      .event(
        "success",
        UploadBaseSchema.extend({
          "storage.url": z.string().optional(),
          "storage.duration_ms": z.number(),
        }),
      )
      .event(
        "error",
        UploadBaseSchema.extend({
          "storage.duration_ms": z.number(),
          "storage.error.code": z.string(),
          "storage.error.message": z.string(),
        }),
      ),
  )
  // ==========================================================================
  // DELETE EVENTS
  // ==========================================================================
  .group("delete", (g) =>
    g
      .event("started", PathSchema)
      .event(
        "success",
        PathSchema.extend({
          "storage.duration_ms": z.number(),
        }),
      )
      .event(
        "error",
        PathSchema.extend({
          "storage.duration_ms": z.number(),
          "storage.error.code": z.string(),
          "storage.error.message": z.string(),
        }),
      ),
  )
  // ==========================================================================
  // COPY EVENTS
  // ==========================================================================
  .group("copy", (g) =>
    g
      .event("started", TransferSchema)
      .event(
        "success",
        TransferSchema.extend({
          "storage.duration_ms": z.number(),
        }),
      )
      .event(
        "error",
        TransferSchema.extend({
          "storage.duration_ms": z.number(),
          "storage.error.code": z.string(),
          "storage.error.message": z.string(),
        }),
      ),
  )
  // ==========================================================================
  // MOVE EVENTS
  // ==========================================================================
  .group("move", (g) =>
    g
      .event("started", TransferSchema)
      .event(
        "success",
        TransferSchema.extend({
          "storage.duration_ms": z.number(),
        }),
      )
      .event(
        "error",
        TransferSchema.extend({
          "storage.duration_ms": z.number(),
          "storage.error.code": z.string(),
          "storage.error.message": z.string(),
        }),
      ),
  )
  // ==========================================================================
  // LIST EVENTS
  // ==========================================================================
  .group("list", (g) =>
    g
      .event("started", ListSchema)
      .event(
        "success",
        ListSchema.extend({
          "storage.count": z.number(),
          "storage.duration_ms": z.number(),
        }),
      )
      .event(
        "error",
        ListSchema.extend({
          "storage.duration_ms": z.number(),
          "storage.error.code": z.string(),
          "storage.error.message": z.string(),
        }),
      ),
  )
  // ==========================================================================
  // GET EVENTS
  // ==========================================================================
  .group("get", (g) =>
    g
      .event("started", PathSchema)
      .event(
        "success",
        PathSchema.extend({
          "storage.found": z.boolean(),
          "storage.size": z.number().optional(),
          "storage.content_type": z.string().optional(),
          "storage.duration_ms": z.number(),
        }),
      )
      .event(
        "error",
        PathSchema.extend({
          "storage.duration_ms": z.number(),
          "storage.error.code": z.string(),
          "storage.error.message": z.string(),
        }),
      ),
  )
  // ==========================================================================
  // STREAM EVENTS
  // ==========================================================================
  .group("stream", (g) =>
    g
      .event("started", PathSchema)
      .event(
        "success",
        PathSchema.extend({
          "storage.duration_ms": z.number(),
        }),
      )
      .event(
        "error",
        PathSchema.extend({
          "storage.duration_ms": z.number(),
          "storage.error.code": z.string(),
          "storage.error.message": z.string(),
        }),
      ),
  )
  .build();

export type IgniterStorageTelemetryEventsType =
  typeof IgniterStorageTelemetryEvents.$Infer;
