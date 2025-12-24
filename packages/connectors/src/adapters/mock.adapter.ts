import {
  type IgniterConnectorRecord,
  type IgniterConnectorUpdateData,
} from "../types/adapter";
import { IgniterConnectorBaseAdapter } from "./connector.adapter";

/**
 * In-memory mock adapter for `@igniter-js/connectors`.
 *
 * Use this in tests to avoid real database calls.
 */
export class IgniterConnectorMockAdapter extends IgniterConnectorBaseAdapter {
  /** Creates a new mock adapter instance. */
  static create(): IgniterConnectorMockAdapter {
    return new IgniterConnectorMockAdapter();
  }

  /** Tracks method call counts. */
  public readonly calls = {
    get: 0,
    list: 0,
    save: 0,
    update: 0,
    delete: 0,
    exists: 0,
    countConnections: 0,
    findByWebhookSecret: 0,
    updateWebhookMetadata: 0,
  };

  /** Stored connector records keyed by scope/identity/provider. */
  public readonly records = new Map<string, IgniterConnectorRecord & {
    webhookMetadata?: {
      lastEventAt: Date;
      lastEventResult: "success" | "error";
      error?: string;
    };
  }>();

  private idCounter = 0;

  private toKey(scope: string, identity: string, provider: string): string {
    return `${scope}:${identity}:${provider}`;
  }

  async get(
    scope: string,
    identity: string,
    provider: string,
  ): Promise<IgniterConnectorRecord | null> {
    this.calls.get += 1;
    return this.records.get(this.toKey(scope, identity, provider)) ?? null;
  }

  async list(
    scope: string,
    identity: string,
  ): Promise<IgniterConnectorRecord[]> {
    this.calls.list += 1;
    const prefix = `${scope}:${identity}:`;
    return Array.from(this.records.entries())
      .filter(([key]) => key.startsWith(prefix))
      .map(([, record]) => record);
  }

  async save(
    scope: string,
    identity: string,
    provider: string,
    value: Record<string, unknown>,
    enabled: boolean,
  ): Promise<IgniterConnectorRecord> {
    this.calls.save += 1;
    const key = this.toKey(scope, identity, provider);
    const existing = this.records.get(key);
    const now = new Date();

    const record: IgniterConnectorRecord = {
      id: existing?.id ?? `mock_${++this.idCounter}`,
      scope,
      identity,
      provider,
      value,
      enabled,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    this.records.set(key, record);
    return record;
  }

  async update(
    scope: string,
    identity: string,
    provider: string,
    data: IgniterConnectorUpdateData,
  ): Promise<IgniterConnectorRecord> {
    this.calls.update += 1;
    const key = this.toKey(scope, identity, provider);
    const existing = this.records.get(key);
    if (!existing) {
      throw new Error("IGNITER_CONNECTOR_RECORD_NOT_FOUND");
    }

    const updated: IgniterConnectorRecord = {
      ...existing,
      value: data.value ?? existing.value,
      enabled: data.enabled ?? existing.enabled,
      updatedAt: new Date(),
    };

    this.records.set(key, updated);
    return updated;
  }

  async delete(
    scope: string,
    identity: string,
    provider: string,
  ): Promise<void> {
    this.calls.delete += 1;
    this.records.delete(this.toKey(scope, identity, provider));
  }

  async exists(
    scope: string,
    identity: string,
    provider: string,
  ): Promise<boolean> {
    this.calls.exists += 1;
    return this.records.has(this.toKey(scope, identity, provider));
  }

  async countConnections(provider: string): Promise<number> {
    this.calls.countConnections += 1;
    return Array.from(this.records.values()).filter(
      (record) => record.provider === provider,
    ).length;
  }

  async findByWebhookSecret(
    provider: string,
    secret: string,
  ): Promise<IgniterConnectorRecord | null> {
    this.calls.findByWebhookSecret += 1;
    for (const record of this.records.values()) {
      if (record.provider !== provider) continue;
      const webhook = record.value.webhook as { secret?: string } | undefined;
      if (webhook?.secret === secret) {
        return record;
      }
    }
    return null;
  }

  async updateWebhookMetadata(
    provider: string,
    secret: string,
    metadata: {
      lastEventAt: Date;
      lastEventResult: "success" | "error";
      error?: string;
    },
  ): Promise<void> {
    this.calls.updateWebhookMetadata += 1;
    for (const [key, record] of this.records.entries()) {
      if (record.provider !== provider) continue;
      const webhook = record.value.webhook as { secret?: string } | undefined;
      if (webhook?.secret !== secret) continue;
      this.records.set(key, { ...record, webhookMetadata: metadata });
      return;
    }
  }

  /** Clears internal state for reuse in tests. */
  clear(): void {
    this.records.clear();
    this.idCounter = 0;
    Object.keys(this.calls).forEach((key) => {
      this.calls[key as keyof typeof this.calls] = 0;
    });
  }
}
