import type {
  IgniterStoreEventContext,
  IgniterStoreEventsRegistry,
  IgniterStoreFlattenRegistryKeys,
  IgniterStoreGetEventSchema,
  IgniterStoreInferEventSchema,
  IgniterStoreManager,
  IgniterStoreScopeEntry,
  IgniterStoreScopeIdentifier,
  IgniterStoreUnsubscribeFn,
} from "@igniter-js/store";
import type { IgniterCoreTelemetryManager } from "../types/telemetry.interface";
import type { IgniterLogger } from "../types";
import type {
  IgniterRealtimeConnectionsApi,
  IgniterRealtimeConnectionsArgs,
  IgniterRealtimeConnectionMetadata,
  IgniterRealtimeEvent,
  IgniterRealtimeEventName,
  IgniterRealtimeSubscribeHandler,
  IgniterRealtimeTransport,
} from "../types/realtime.interface";
import { IgniterStoreCacheProcessor } from "./cache.processor";
import { getRequestIp, parseDeviceFromUserAgent } from "../utils/request";
import { resolveGeo } from "../utils/geo";

type SubscriptionEntry = {
  count: number;
  unsubscribe: IgniterStoreUnsubscribeFn;
};

class RealtimeSubscriptionRegistry<
  TRegistry extends IgniterStoreEventsRegistry,
  TScopes extends string,
> {
  private readonly subscriptions = new Map<string, SubscriptionEntry>();

  constructor(
    private readonly baseStore: IgniterStoreManager<TRegistry, TScopes>,
    private readonly transport: IgniterRealtimeTransport,
    private readonly logger?: IgniterLogger,
    private readonly telemetry?: IgniterCoreTelemetryManager | null,
  ) {}

  async ensure(
    scopeChain: IgniterStoreScopeEntry[],
    eventName: string,
  ): Promise<void> {
    const key = this.createKey(scopeChain, eventName);
    const existing = this.subscriptions.get(key);
    if (existing) {
      existing.count += 1;
      return;
    }

    const scopesCount = scopeChain.length;
    this.telemetry?.emit("igniter.core.realtime.subscribe.started", {
      level: "debug",
      attributes: {
        "ctx.realtime.event": eventName,
        "ctx.realtime.scopes_count": scopesCount,
      },
    });

    const scopedStore = this.applyScopes(this.baseStore, scopeChain);
    try {
      const unsubscribe = await scopedStore.events.subscribe(
        eventName,
        async (ctx: IgniterStoreEventContext) => {
          const event: IgniterRealtimeEvent = {
            channel: ctx.type,
            data: ctx.data,
            timestamp: ctx.timestamp,
            type: ctx.type === "http:revalidate:requested" ? "revalidate" : undefined,
          };
          const recipients = this.transport.publish(event);

          this.telemetry?.emit("igniter.core.realtime.event.deliver.success", {
            level: "debug",
            attributes: {
              "ctx.realtime.event": ctx.type,
              "ctx.realtime.recipients_count": recipients,
            },
          });
        },
      );

      this.subscriptions.set(key, { count: 1, unsubscribe });

      this.telemetry?.emit("igniter.core.realtime.subscribe.success", {
        level: "debug",
        attributes: {
          "ctx.realtime.event": eventName,
          "ctx.realtime.scopes_count": scopesCount,
        },
      });
    } catch (error) {
      this.telemetry?.emit("igniter.core.realtime.subscribe.error", {
        level: "error",
        attributes: {
          "ctx.realtime.event": eventName,
          "ctx.realtime.scopes_count": scopesCount,
          "ctx.error.type": "runtime",
          "ctx.error.code":
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            (error as { code?: string }).code
              ? String((error as { code?: string }).code)
              : "REALTIME_SUBSCRIBE_FAILED",
          "ctx.error.message":
            error instanceof Error ? error.message : "Realtime subscribe failed",
          "ctx.error.component": "IgniterStoreRealtimeProcessor",
        },
      });
      throw error;
    }
  }

  async release(
    scopeChain: IgniterStoreScopeEntry[],
    eventName: string,
  ): Promise<void> {
    const key = this.createKey(scopeChain, eventName);
    const entry = this.subscriptions.get(key);
    if (!entry) return;

    entry.count -= 1;
    if (entry.count > 0) {
      return;
    }

    const scopesCount = scopeChain.length;
    this.telemetry?.emit("igniter.core.realtime.unsubscribe.started", {
      level: "debug",
      attributes: {
        "ctx.realtime.event": eventName,
        "ctx.realtime.scopes_count": scopesCount,
      },
    });

    try {
      await entry.unsubscribe();
      this.subscriptions.delete(key);

      this.telemetry?.emit("igniter.core.realtime.unsubscribe.success", {
        level: "debug",
        attributes: {
          "ctx.realtime.event": eventName,
          "ctx.realtime.scopes_count": scopesCount,
        },
      });
    } catch (error) {
      this.telemetry?.emit("igniter.core.realtime.unsubscribe.error", {
        level: "error",
        attributes: {
          "ctx.realtime.event": eventName,
          "ctx.realtime.scopes_count": scopesCount,
          "ctx.error.type": "runtime",
          "ctx.error.code":
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            (error as { code?: string }).code
              ? String((error as { code?: string }).code)
              : "REALTIME_UNSUBSCRIBE_FAILED",
          "ctx.error.message":
            error instanceof Error
              ? error.message
              : "Realtime unsubscribe failed",
          "ctx.error.component": "IgniterStoreRealtimeProcessor",
        },
      });
      throw error;
    }
  }

  private applyScopes(
    store: IgniterStoreManager<TRegistry, TScopes>,
    scopeChain: IgniterStoreScopeEntry[],
  ): IgniterStoreManager<TRegistry, TScopes> {
    let scoped = store;
    for (const scope of scopeChain) {
      scoped = scoped.scope(scope.key as TScopes, scope.identifier);
    }
    return scoped;
  }

  private createKey(scopeChain: IgniterStoreScopeEntry[], eventName: string): string {
    if (scopeChain.length === 0) {
      return `global::${eventName}`;
    }
    const scopeKey = scopeChain
      .map((entry) => `${entry.key}:${entry.identifier}`)
      .join("|");
    return `${scopeKey}::${eventName}`;
  }
}

class IgniterRealtimeConnections<
  TRegistry extends IgniterStoreEventsRegistry,
  TScopes extends string,
> implements IgniterRealtimeConnectionsApi {
  private readonly store: IgniterStoreManager<TRegistry, TScopes>;
  private readonly scopeFilter?: { key: TScopes; id: IgniterStoreScopeIdentifier };

  constructor(
    store: IgniterStoreManager<TRegistry, TScopes>,
    scopeFilter?: { key: TScopes; id: IgniterStoreScopeIdentifier },
  ) {
    this.store = store;
    this.scopeFilter = scopeFilter;
  }

  async list(
    args: IgniterRealtimeConnectionsArgs = {},
  ): Promise<IgniterRealtimeConnectionMetadata[]> {
    const ids = await this.scanConnectionIds();
    const entries = await this.loadConnections(ids);
    const filtered = entries.filter((entry) => this.matches(entry, args.where));

    if (this.scopeFilter) {
      const token = `${this.scopeFilter.key}:${this.scopeFilter.id}`;
      filtered.splice(
        0,
        filtered.length,
        ...filtered.filter((entry) => entry.scopes?.includes(token)),
      );
    }

    const order = args.orderBy?.createdAt ?? "desc";
    filtered.sort((a, b) => {
      const aTime = Date.parse(a.createdAt || "");
      const bTime = Date.parse(b.createdAt || "");
      return order === "asc" ? aTime - bTime : bTime - aTime;
    });

    if (args.skip) {
      filtered.splice(0, args.skip);
    }

    if (args.take !== undefined) {
      return filtered.slice(0, args.take);
    }

    return filtered;
  }

  async count(args: IgniterRealtimeConnectionsArgs = {}): Promise<number> {
    const items = await this.list(args);
    return items.length;
  }

  async getFirst(
    args: IgniterRealtimeConnectionsArgs = {},
  ): Promise<IgniterRealtimeConnectionMetadata | null> {
    const items = await this.list({ ...args, orderBy: { createdAt: "asc" } });
    return items[0] ?? null;
  }

  async getLast(
    args: IgniterRealtimeConnectionsArgs = {},
  ): Promise<IgniterRealtimeConnectionMetadata | null> {
    const items = await this.list({ ...args, orderBy: { createdAt: "desc" } });
    return items[0] ?? null;
  }

  async getById(
    connectionId: string,
  ): Promise<IgniterRealtimeConnectionMetadata | null> {
    return this.store.kv.get(`sse:connections:${connectionId}`);
  }

  scope(
    key: string,
    id: IgniterStoreScopeIdentifier,
  ): IgniterRealtimeConnectionsApi {
    return new IgniterRealtimeConnections(this.store, { key: key as TScopes, id });
  }

  private async scanConnectionIds(): Promise<string[]> {
    const ids: string[] = [];
    let cursor = "0";
    const marker = ":kv:sse:connections:";

    do {
      const result = await this.store.dev.scan("sse:connections:*", {
        cursor,
        count: 200,
      });
      cursor = result.cursor;

      for (const key of result.keys) {
        const index = key.indexOf(marker);
        if (index === -1) continue;
        const id = key.slice(index + marker.length);
        if (id) ids.push(id);
      }
    } while (cursor !== "0");

    return Array.from(new Set(ids));
  }

  private async loadConnections(
    ids: string[],
  ): Promise<IgniterRealtimeConnectionMetadata[]> {
    const entries = await Promise.all(
      ids.map((id) => this.store.kv.get(`sse:connections:${id}`)),
    );
    return entries.filter(Boolean) as IgniterRealtimeConnectionMetadata[];
  }

  private matches(
    entry: IgniterRealtimeConnectionMetadata,
    where?: IgniterRealtimeConnectionsArgs["where"],
  ): boolean {
    if (!where) return true;

    if (where.scope) {
      const token = `${where.scope.key}:${where.scope.id}`;
      if (!entry.scopes?.includes(token)) {
        return false;
      }
    }

    if (where.channel) {
      if (!entry.channels.includes(where.channel)) {
        return false;
      }
    }

    if (where.ip && entry.ip !== where.ip) {
      return false;
    }

    if (where.device) {
      const device = entry.device ?? {};
      for (const [key, value] of Object.entries(where.device)) {
        if ((device as Record<string, string | undefined>)[key] !== value) {
          return false;
        }
      }
    }

    if (where.geo) {
      const geo = entry.geo ?? {};
      for (const [key, value] of Object.entries(where.geo)) {
        if ((geo as Record<string, string | number | undefined>)[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }
}

export class IgniterStoreRealtimeProcessor<
  TRegistry extends IgniterStoreEventsRegistry = IgniterStoreEventsRegistry,
  TScopes extends string = string,
> {
  private readonly store: IgniterStoreManager<TRegistry, TScopes>;
  private readonly baseStore: IgniterStoreManager<TRegistry, TScopes>;
  private readonly transport: IgniterRealtimeTransport;
  private readonly cache?: IgniterStoreCacheProcessor;
  private readonly logger?: IgniterLogger;
  private readonly telemetry?: IgniterCoreTelemetryManager | null;
  private readonly scopeChain: IgniterStoreScopeEntry[];
  private readonly subscriptions: RealtimeSubscriptionRegistry<TRegistry, TScopes>;

  public readonly connections: IgniterRealtimeConnectionsApi;

  constructor(options: {
    store: IgniterStoreManager<TRegistry, TScopes>;
    transport: IgniterRealtimeTransport;
    cache?: IgniterStoreCacheProcessor;
    logger?: IgniterLogger;
    telemetry?: IgniterCoreTelemetryManager | null;
    scopeChain?: IgniterStoreScopeEntry[];
    baseStore?: IgniterStoreManager<TRegistry, TScopes>;
    subscriptions?: RealtimeSubscriptionRegistry<TRegistry, TScopes>;
  }) {
    this.store = options.store;
    this.baseStore = options.baseStore ?? options.store;
    this.transport = options.transport;
    this.cache = options.cache;
    this.logger = options.logger?.child("IgniterStoreRealtimeProcessor");
    this.telemetry = options.telemetry ?? null;
    this.scopeChain = options.scopeChain ?? [];
    this.subscriptions =
      options.subscriptions ??
      new RealtimeSubscriptionRegistry(
        this.baseStore,
        this.transport,
        this.logger,
        this.telemetry,
      );

    this.connections = new IgniterRealtimeConnections<TRegistry, TScopes>(
      this.baseStore,
    );
  }

  $api(): Pick<
    IgniterStoreRealtimeProcessor<TRegistry, TScopes>,
    "scope" | "publish" | "subscribe" | "connections"
  > {
    return {
      scope: this.scope.bind(this),
      publish: this.publish.bind(this),
      subscribe: this.subscribe.bind(this),
      connections: this.connections,
    };
  }

  scope<TKey extends TScopes>(
    key: TKey,
    id: IgniterStoreScopeIdentifier,
  ): IgniterStoreRealtimeProcessor<TRegistry, TScopes> {
    const scopedStore = this.store.scope(key, id);
    return new IgniterStoreRealtimeProcessor<TRegistry, TScopes>({
      store: scopedStore,
      transport: this.transport,
      cache: this.cache,
      logger: this.logger,
      telemetry: this.telemetry,
      scopeChain: [...this.scopeChain, { key, identifier: String(id) }],
      baseStore: this.baseStore,
      subscriptions: this.subscriptions,
    });
  }

  publish<TEventName extends IgniterStoreFlattenRegistryKeys<TRegistry>>(
    eventName: TEventName,
    payload: IgniterStoreInferEventSchema<
      IgniterStoreGetEventSchema<TRegistry, TEventName>
    >,
  ): Promise<void> {
    const scopesCount = this.scopeChain.length;
    this.telemetry?.emit("igniter.core.realtime.event.publish.started", {
      level: "debug",
      attributes: {
        "ctx.realtime.event": String(eventName),
        "ctx.realtime.scopes_count": scopesCount,
      },
    });

    return this.store.events
      .publish(
        eventName,
        payload as TEventName extends IgniterStoreFlattenRegistryKeys<TRegistry>
          ? IgniterStoreInferEventSchema<IgniterStoreGetEventSchema<TRegistry, TEventName>>
          : unknown,
      )
      .then(() => {
        this.telemetry?.emit("igniter.core.realtime.event.publish.success", {
          level: "debug",
          attributes: {
            "ctx.realtime.event": String(eventName),
            "ctx.realtime.scopes_count": scopesCount,
          },
        });
      })
      .catch((error) => {
        this.telemetry?.emit("igniter.core.realtime.event.publish.error", {
          level: "error",
          attributes: {
            "ctx.realtime.event": String(eventName),
            "ctx.realtime.scopes_count": scopesCount,
            "ctx.error.type": "runtime",
            "ctx.error.code":
              typeof error === "object" &&
              error !== null &&
              "code" in error &&
              (error as { code?: string }).code
                ? String((error as { code?: string }).code)
                : "REALTIME_PUBLISH_FAILED",
            "ctx.error.message":
              error instanceof Error
                ? error.message
                : "Realtime publish failed",
            "ctx.error.component": "IgniterStoreRealtimeProcessor",
          },
        });
        throw error;
      });
  }

  subscribe<TEventName extends IgniterRealtimeEventName<TRegistry>>(
    eventName: TEventName,
    handler: IgniterRealtimeSubscribeHandler<TRegistry, TEventName>,
  ): Promise<IgniterStoreUnsubscribeFn> {
    const scopesCount = this.scopeChain.length;
    this.telemetry?.emit("igniter.core.realtime.subscribe.started", {
      level: "debug",
      attributes: {
        "ctx.realtime.event": String(eventName),
        "ctx.realtime.scopes_count": scopesCount,
      },
    });

    return this.store.events
      .subscribe(eventName, handler as any)
      .then((unsubscribe) => {
        this.telemetry?.emit("igniter.core.realtime.subscribe.success", {
          level: "debug",
          attributes: {
            "ctx.realtime.event": String(eventName),
            "ctx.realtime.scopes_count": scopesCount,
          },
        });
        return unsubscribe;
      })
      .catch((error) => {
        this.telemetry?.emit("igniter.core.realtime.subscribe.error", {
          level: "error",
          attributes: {
            "ctx.realtime.event": String(eventName),
            "ctx.realtime.scopes_count": scopesCount,
            "ctx.error.type": "runtime",
            "ctx.error.code":
              typeof error === "object" &&
              error !== null &&
              "code" in error &&
              (error as { code?: string }).code
                ? String((error as { code?: string }).code)
                : "REALTIME_SUBSCRIBE_FAILED",
            "ctx.error.message":
              error instanceof Error
                ? error.message
                : "Realtime subscribe failed",
            "ctx.error.component": "IgniterStoreRealtimeProcessor",
          },
        });
        throw error;
      });
  }

  async openConnection(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const channelsParam = url.searchParams.get("channels");
    const scopesParam = url.searchParams.get("scopes");
    const channels = channelsParam ? channelsParam.split(",") : [];
    const scopeChain = [
      ...this.scopeChain,
      ...this.parseScopes(scopesParam),
    ];
    const connectionId = crypto.randomUUID();
    const connectionAttributes = {
      "ctx.realtime.transport": this.transport.name,
      "ctx.realtime.channels_count": channels.length,
      "ctx.realtime.scopes_count": scopeChain.length,
    };

    this.telemetry?.emit("igniter.core.realtime.connection.open.started", {
      level: "debug",
      attributes: connectionAttributes,
    });

    try {
      await this.persistConnection(connectionId, request, channels, scopeChain);

      for (const channel of channels) {
        await this.subscriptions.ensure(scopeChain, channel);
      }

      const response = await this.transport.openConnection(request, {
        connectionId,
        channels,
        scopes: scopeChain.map((scope) => `${scope.key}:${scope.identifier}`),
        onClose: async (reason) => {
          this.telemetry?.emit("igniter.core.realtime.connection.close.started", {
            level: "debug",
            attributes: connectionAttributes,
          });

          try {
            for (const channel of channels) {
              await this.subscriptions.release(scopeChain, channel);
            }
            await this.removeConnection(connectionId, channels, scopeChain);

            this.telemetry?.emit("igniter.core.realtime.connection.close.success", {
              level: "debug",
              attributes: connectionAttributes,
            });
          } catch (error) {
            this.telemetry?.emit("igniter.core.realtime.connection.close.error", {
              level: "error",
              attributes: {
                ...connectionAttributes,
                "ctx.error.type": "runtime",
                "ctx.error.code":
                  typeof error === "object" &&
                  error !== null &&
                  "code" in error &&
                  (error as { code?: string }).code
                    ? String((error as { code?: string }).code)
                    : "REALTIME_CONNECTION_CLOSE_FAILED",
                "ctx.error.message":
                  error instanceof Error
                    ? error.message
                    : "Realtime connection close failed",
                "ctx.error.component": "IgniterStoreRealtimeProcessor",
              },
            });
            this.logger?.warn("Realtime connection close failed", {
              connectionId,
              reason,
              error,
            });
          }
        },
        onKeepAlive: async () => {
          try {
            await this.touchConnection(connectionId);
          } finally {
            this.telemetry?.emit("igniter.core.realtime.connection.keepalive", {
              level: "debug",
              attributes: {
                "ctx.realtime.transport": this.transport.name,
              },
            });
          }
        },
      });

      this.telemetry?.emit("igniter.core.realtime.connection.open.success", {
        level: "debug",
        attributes: connectionAttributes,
      });

      return response;
    } catch (error) {
      this.telemetry?.emit("igniter.core.realtime.connection.open.error", {
        level: "error",
        attributes: {
          ...connectionAttributes,
          "ctx.error.type": "runtime",
          "ctx.error.code":
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            (error as { code?: string }).code
              ? String((error as { code?: string }).code)
              : "REALTIME_CONNECTION_OPEN_FAILED",
          "ctx.error.message":
            error instanceof Error
              ? error.message
              : "Realtime connection open failed",
          "ctx.error.component": "IgniterStoreRealtimeProcessor",
        },
      });
      throw error;
    }
  }

  private parseScopes(scopesParam: string | null): IgniterStoreScopeEntry[] {
    if (!scopesParam) return [];
    return scopesParam
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .map((scope) => {
        const [key, ...rest] = scope.split(":");
        return { key, identifier: rest.join(":") };
      })
      .filter((entry) => entry.key && entry.identifier);
  }

  private async persistConnection(
    connectionId: string,
    request: Request,
    channels: string[],
    scopeChain: IgniterStoreScopeEntry[],
  ): Promise<void> {
    const ip = getRequestIp(request);
    const userAgent = request.headers.get("user-agent") || undefined;
    const device = parseDeviceFromUserAgent(userAgent);
    const geo = await resolveGeo({
      ip,
      headers: request.headers,
      cache: this.cache,
      logger: this.logger,
    });

    const metadata: IgniterRealtimeConnectionMetadata = {
      connectionId,
      channels,
      scopes: scopeChain.map((scope) => `${scope.key}:${scope.identifier}`),
      ip,
      device,
      geo: geo ?? undefined,
      createdAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      userAgent,
    };

    await this.baseStore.kv.set(`sse:connections:${connectionId}`, metadata, {
      ttl: 300,
    });
    await this.addToIndex("sse:connections", connectionId);

    for (const channel of channels) {
      await this.addToIndex(`sse:channels:${channel}`, connectionId);
    }

    for (const scope of metadata.scopes ?? []) {
      await this.addToIndex(`sse:scopes:${scope}`, connectionId);
    }
  }

  private async touchConnection(connectionId: string): Promise<void> {
    const existing = await this.baseStore.kv.get<IgniterRealtimeConnectionMetadata>(
      `sse:connections:${connectionId}`,
    );
    if (!existing) return;

    const next = {
      ...existing,
      lastSeenAt: new Date().toISOString(),
    };
    await this.baseStore.kv.set(`sse:connections:${connectionId}`, next, {
      ttl: 300,
    });
  }

  private async removeConnection(
    connectionId: string,
    channels: string[],
    scopeChain: IgniterStoreScopeEntry[],
  ): Promise<void> {
    await this.baseStore.kv.remove(`sse:connections:${connectionId}`);
    await this.removeFromIndex("sse:connections", connectionId);

    for (const channel of channels) {
      await this.removeFromIndex(`sse:channels:${channel}`, connectionId);
    }

    for (const scope of scopeChain) {
      await this.removeFromIndex(
        `sse:scopes:${scope.key}:${scope.identifier}`,
        connectionId,
      );
    }
  }

  private async addToIndex(indexKey: string, id: string): Promise<void> {
    const existing = (await this.baseStore.kv.get<string[]>(indexKey)) ?? [];
    const next = new Set(existing);
    next.add(id);
    await this.baseStore.kv.set(indexKey, Array.from(next));
  }

  private async removeFromIndex(indexKey: string, id: string): Promise<void> {
    const existing = await this.baseStore.kv.get<string[]>(indexKey);
    if (!existing || existing.length === 0) return;
    const next = existing.filter((value) => value !== id);
    if (next.length === 0) {
      await this.baseStore.kv.remove(indexKey);
      return;
    }
    await this.baseStore.kv.set(indexKey, next);
  }
}
