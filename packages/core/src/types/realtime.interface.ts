import type {
  IgniterStoreEventContext,
  IgniterStoreEventsRegistry,
  IgniterStoreFlattenRegistryKeys,
  IgniterStoreGetEventSchema,
  IgniterStoreInferEventSchema,
  IgniterStoreScopeIdentifier,
  IgniterStoreUnsubscribeFn,
} from "@igniter-js/store";

export interface IgniterRealtimeEvent<TPayload = unknown> {
  channel: string;
  data: TPayload;
  type?: string;
  id?: string;
  timestamp?: string;
}

export type IgniterRealtimeEventName<
  TRegistry extends IgniterStoreEventsRegistry,
> = IgniterStoreFlattenRegistryKeys<TRegistry>;

export type IgniterRealtimeEventPayload<
  TRegistry extends IgniterStoreEventsRegistry,
  TEventName extends IgniterRealtimeEventName<TRegistry>,
> = IgniterStoreInferEventSchema<
  IgniterStoreGetEventSchema<TRegistry, TEventName>
>;

export type IgniterRealtimeEventContext<
  TRegistry extends IgniterStoreEventsRegistry,
  TEventName extends IgniterRealtimeEventName<TRegistry>,
> = IgniterStoreEventContext<
  TEventName,
  IgniterRealtimeEventPayload<TRegistry, TEventName>
>;

export interface IgniterRequestDevice {
  os?: string;
  browser?: string;
  device?: string;
}

export interface IgniterRequestGeo {
  country?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

export interface IgniterRealtimeConnectionMetadata {
  connectionId: string;
  channels: string[];
  scopes?: string[];
  ip?: string;
  device?: IgniterRequestDevice;
  geo?: IgniterRequestGeo;
  createdAt: string;
  lastSeenAt?: string;
  userAgent?: string;
}

export type IgniterRealtimeConnectionWhere = {
  scope?: { key: string; id: IgniterStoreScopeIdentifier };
  channel?: string;
  ip?: string;
  device?: Partial<IgniterRequestDevice>;
  geo?: Partial<IgniterRequestGeo>;
};

export type IgniterRealtimeConnectionOrderBy = {
  createdAt?: "asc" | "desc";
};

export interface IgniterRealtimeConnectionsArgs {
  where?: IgniterRealtimeConnectionWhere;
  orderBy?: IgniterRealtimeConnectionOrderBy;
  take?: number;
  skip?: number;
}

export interface IgniterRealtimeConnectionsApi {
  list(args?: IgniterRealtimeConnectionsArgs): Promise<
    IgniterRealtimeConnectionMetadata[]
  >;
  count(args?: IgniterRealtimeConnectionsArgs): Promise<number>;
  getFirst(
    args?: IgniterRealtimeConnectionsArgs,
  ): Promise<IgniterRealtimeConnectionMetadata | null>;
  getLast(
    args?: IgniterRealtimeConnectionsArgs,
  ): Promise<IgniterRealtimeConnectionMetadata | null>;
  getById(
    connectionId: string,
  ): Promise<IgniterRealtimeConnectionMetadata | null>;
  scope(
    key: string,
    id: IgniterStoreScopeIdentifier,
  ): IgniterRealtimeConnectionsApi;
}

export interface IgniterRealtimeTransport {
  name: "sse" | "ws" | (string & {});
  openConnection(
    request: Request,
    options: {
      connectionId: string;
      channels: string[];
      scopes?: string[];
      headers?: Record<string, string>;
      keepAliveInterval?: number;
      onClose?: (reason?: string) => void;
      onKeepAlive?: () => void;
    },
  ): Promise<Response>;
  publish(event: IgniterRealtimeEvent): number;
  closeAll(): void;
}

export type IgniterRealtimeSubscribeHandler<
  TRegistry extends IgniterStoreEventsRegistry,
  TEventName extends IgniterRealtimeEventName<TRegistry>,
> = (ctx: IgniterRealtimeEventContext<TRegistry, TEventName>) => void | Promise<void>;

export type IgniterRealtimeSubscribeFn<
  TRegistry extends IgniterStoreEventsRegistry,
  TEventName extends IgniterRealtimeEventName<TRegistry>,
> = (
  eventName: TEventName,
  handler: IgniterRealtimeSubscribeHandler<TRegistry, TEventName>,
) => Promise<IgniterStoreUnsubscribeFn>;
