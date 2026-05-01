import type { IgniterLogger } from "../types";
import type { IgniterStoreManager } from "@igniter-js/store";
import type { IgniterRequestGeo } from "../types/realtime.interface";
import { generateQueryKey } from "../utils/queryKey";

export type IgniterCacheOptions = {
  ttl?: number;
  policy?: "public" | "private" | "no-store";
  staleWhileRevalidate?: number;
  sMaxAge?: number;
  tags?: string[];
};

export class IgniterStoreCacheProcessor {
  private readonly store: IgniterStoreManager;
  private readonly logger?: IgniterLogger;

  constructor(store: IgniterStoreManager, logger?: IgniterLogger) {
    this.store = store;
    this.logger = logger?.child("IgniterStoreCacheProcessor");
  }

  $api(): Pick<
    IgniterStoreCacheProcessor,
    "get" | "set" | "invalidate" | "tag" | "resolveKey"
  > {
    return {
      get: this.get.bind(this),
      set: this.set.bind(this),
      invalidate: this.invalidate.bind(this),
      tag: this.tag.bind(this),
      resolveKey: this.resolveKey.bind(this),
    };
  }

  get<T>(key: string): Promise<T | null> {
    return this.store.kv.get(`cache:responses:${key}`);
  }

  async set<T>(key: string, value: T, options?: IgniterCacheOptions): Promise<void> {
    await this.store.kv.set(`cache:responses:${key}`, value, {
      ttl: options?.ttl,
    });

    if (options?.tags && options.tags.length > 0) {
      await this.tag(key, options.tags);
    }
  }

  async invalidate(keys: string | string[] | { tags?: string[] }): Promise<void> {
    if (Array.isArray(keys)) {
      await Promise.all(keys.map((key) => this.store.kv.remove(`cache:responses:${key}`)));
      return;
    }

    if (typeof keys === "string") {
      await this.store.kv.remove(`cache:responses:${keys}`);
      return;
    }

    const tags = keys?.tags ?? [];
    if (tags.length === 0) return;

    for (const tag of tags) {
      const taggedKeys = await this.store.kv.get<string[]>(
        `cache:tags:${tag}`,
      );
      if (!taggedKeys || taggedKeys.length === 0) continue;
      await Promise.all(
        taggedKeys.map((key) => this.store.kv.remove(`cache:responses:${key}`)),
      );
      await this.store.kv.remove(`cache:tags:${tag}`);
    }
  }

  async tag(key: string, tags: string[]): Promise<void> {
    for (const tag of tags) {
      const existing = (await this.store.kv.get<string[]>(`cache:tags:${tag}`)) ?? [];
      const next = new Set(existing);
      next.add(key);
      await this.store.kv.set(`cache:tags:${tag}`, Array.from(next));
    }
  }

  resolveKey(input: {
    path: string;
    params?: Record<string, any>;
    query?: Record<string, any>;
    scopes?: string[];
  }): string {
    const [controller, action] = input.path.split(".");
    const baseKey = controller && action
      ? generateQueryKey(controller, action, {
          ...(input.params && { params: input.params }),
          ...(input.query && { query: input.query }),
        })
      : input.path;

    if (!input.scopes || input.scopes.length === 0) {
      return baseKey;
    }

    return `${baseKey}:scopes:${input.scopes.sort().join(",")}`;
  }

  async getGeo(ip: string): Promise<IgniterRequestGeo | null> {
    return this.store.kv.get(`geo:ip:${ip}`);
  }

  async setGeo(ip: string, geo: IgniterRequestGeo, ttlSeconds = 86400): Promise<void> {
    await this.store.kv.set(`geo:ip:${ip}`, geo, { ttl: ttlSeconds });
  }
}
