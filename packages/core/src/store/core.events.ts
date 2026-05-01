import { z } from "zod";
import { IgniterStoreEvents } from "@igniter-js/store";

const RealtimePublishedPayload = z.object({
  eventName: z.string(),
  payload: z.unknown(),
  scopes: z.array(z.string()).optional(),
  timestamp: z.string().optional(),
});

export const IgniterCoreStoreEvents = IgniterStoreEvents.create("http")
  .group("revalidate", (r) =>
    r.event(
      "requested",
      z.object({
        queryKeys: z.array(z.string()),
        data: z.unknown().optional(),
        timestamp: z.string().optional(),
      }),
    ),
  )
  .group("cache", (c) =>
    c.event(
      "tagged",
      z.object({
        policy: z.enum(["public", "private", "no-store"]),
        ttl: z.number().optional(),
        staleWhileRevalidate: z.number().optional(),
        sMaxAge: z.number().optional(),
        tags: z.array(z.string()).optional(),
      }),
    ),
  )
  .group("sse:connection", (c) =>
    c
      .event(
        "opened",
        z.object({
          connectionId: z.string(),
          channels: z.array(z.string()),
          scopes: z.array(z.string()).optional(),
          userAgent: z.string().optional(),
          createdAt: z.string().optional(),
        }),
      )
      .event(
        "closed",
        z.object({
          connectionId: z.string(),
          reason: z.string().optional(),
          closedAt: z.string().optional(),
        }),
      ),
  )
  .group("sse:event", (e) =>
    e.event(
      "delivered",
      z.object({
        channel: z.string(),
        type: z.string().optional(),
        id: z.string().optional(),
        timestamp: z.string().optional(),
      }),
    ),
  )
  .group("realtime:event", (e) => e.event("published", RealtimePublishedPayload))
  .build();

export type IgniterCoreStoreEventsRegistry =
  typeof IgniterCoreStoreEvents["$Infer"]["events"];
