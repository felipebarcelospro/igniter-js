import type { IgniterTelemetryManager } from "@igniter-js/telemetry";
import type { IgniterStoreTelemetryEvents } from "../telemetry";

/**
 * Store telemetry event names.
 */
export const IGNITER_STORE_TELEMETRY_EVENTS = {
  // Key-value
  KV_GET_STARTED: "igniter.store.kv.get.started",
  KV_GET_SUCCESS: "igniter.store.kv.get.success",
  KV_GET_ERROR: "igniter.store.kv.get.error",
  KV_SET_STARTED: "igniter.store.kv.set.started",
  KV_SET_SUCCESS: "igniter.store.kv.set.success",
  KV_SET_ERROR: "igniter.store.kv.set.error",
  KV_REMOVE_STARTED: "igniter.store.kv.remove.started",
  KV_REMOVE_SUCCESS: "igniter.store.kv.remove.success",
  KV_REMOVE_ERROR: "igniter.store.kv.remove.error",
  KV_EXISTS_STARTED: "igniter.store.kv.exists.started",
  KV_EXISTS_SUCCESS: "igniter.store.kv.exists.success",
  KV_EXISTS_ERROR: "igniter.store.kv.exists.error",
  KV_EXPIRE_STARTED: "igniter.store.kv.expire.started",
  KV_EXPIRE_SUCCESS: "igniter.store.kv.expire.success",
  KV_EXPIRE_ERROR: "igniter.store.kv.expire.error",
  KV_TOUCH_STARTED: "igniter.store.kv.touch.started",
  KV_TOUCH_SUCCESS: "igniter.store.kv.touch.success",
  KV_TOUCH_ERROR: "igniter.store.kv.touch.error",

  // Counters
  COUNTER_INCREMENT_STARTED: "igniter.store.counter.increment.started",
  COUNTER_INCREMENT_SUCCESS: "igniter.store.counter.increment.success",
  COUNTER_INCREMENT_ERROR: "igniter.store.counter.increment.error",
  COUNTER_DECREMENT_STARTED: "igniter.store.counter.decrement.started",
  COUNTER_DECREMENT_SUCCESS: "igniter.store.counter.decrement.success",
  COUNTER_DECREMENT_ERROR: "igniter.store.counter.decrement.error",
  COUNTER_EXPIRE_STARTED: "igniter.store.counter.expire.started",
  COUNTER_EXPIRE_SUCCESS: "igniter.store.counter.expire.success",
  COUNTER_EXPIRE_ERROR: "igniter.store.counter.expire.error",

  // Batch
  BATCH_GET_STARTED: "igniter.store.batch.get.started",
  BATCH_GET_SUCCESS: "igniter.store.batch.get.success",
  BATCH_GET_ERROR: "igniter.store.batch.get.error",
  BATCH_SET_STARTED: "igniter.store.batch.set.started",
  BATCH_SET_SUCCESS: "igniter.store.batch.set.success",
  BATCH_SET_ERROR: "igniter.store.batch.set.error",

  // Claim
  CLAIM_ACQUIRE_STARTED: "igniter.store.claim.acquire.started",
  CLAIM_ACQUIRE_SUCCESS: "igniter.store.claim.acquire.success",
  CLAIM_ACQUIRE_ERROR: "igniter.store.claim.acquire.error",

  // Events
  EVENTS_PUBLISH_STARTED: "igniter.store.events.publish.started",
  EVENTS_PUBLISH_SUCCESS: "igniter.store.events.publish.success",
  EVENTS_PUBLISH_ERROR: "igniter.store.events.publish.error",
  EVENTS_SUBSCRIBE_STARTED: "igniter.store.events.subscribe.started",
  EVENTS_SUBSCRIBE_SUCCESS: "igniter.store.events.subscribe.success",
  EVENTS_SUBSCRIBE_ERROR: "igniter.store.events.subscribe.error",
  EVENTS_UNSUBSCRIBE_STARTED: "igniter.store.events.unsubscribe.started",
  EVENTS_UNSUBSCRIBE_SUCCESS: "igniter.store.events.unsubscribe.success",
  EVENTS_UNSUBSCRIBE_ERROR: "igniter.store.events.unsubscribe.error",

  // Dev tools
  DEV_SCAN_STARTED: "igniter.store.dev.scan.started",
  DEV_SCAN_SUCCESS: "igniter.store.dev.scan.success",
  DEV_SCAN_ERROR: "igniter.store.dev.scan.error",

  // Streams
  STREAM_APPEND_STARTED: "igniter.store.stream.append.started",
  STREAM_APPEND_SUCCESS: "igniter.store.stream.append.success",
  STREAM_APPEND_ERROR: "igniter.store.stream.append.error",
  STREAM_READ_STARTED: "igniter.store.stream.read.started",
  STREAM_READ_SUCCESS: "igniter.store.stream.read.success",
  STREAM_READ_ERROR: "igniter.store.stream.read.error",
  STREAM_ACK_STARTED: "igniter.store.stream.ack.started",
  STREAM_ACK_SUCCESS: "igniter.store.stream.ack.success",
  STREAM_ACK_ERROR: "igniter.store.stream.ack.error",
  STREAM_GROUP_STARTED: "igniter.store.stream.group.started",
  STREAM_GROUP_SUCCESS: "igniter.store.stream.group.success",
  STREAM_GROUP_ERROR: "igniter.store.stream.group.error",
} as const;

export const STORE_TELEMETRY_EVENTS = IGNITER_STORE_TELEMETRY_EVENTS;

export type IgniterStoreTelemetryEvent =
  (typeof IGNITER_STORE_TELEMETRY_EVENTS)[keyof typeof IGNITER_STORE_TELEMETRY_EVENTS];

export type IgniterStoreTelemetryRegistry = {
  [K in IgniterStoreTelemetryEvents["namespace"]]: IgniterStoreTelemetryEvents["events"];
};

export type IgniterStoreTelemetry =
  IgniterTelemetryManager<IgniterStoreTelemetryRegistry>;
