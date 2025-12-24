/**
 * @fileoverview Discord transport adapter for @igniter-js/telemetry
 * @module @igniter-js/telemetry/adapters/discord
 */

import type { IgniterTelemetryTransportAdapter } from "../types/transport";
import type { IgniterTelemetryEnvelope } from "../types/envelope";
import type { IgniterTelemetryLevel } from "../types/levels";

export interface DiscordTransportConfig {
  /**
   * The Discord Webhook URL.
   */
  webhookUrl: string;

  /**
   * Minimum level to notify.
   * @default 'error'
   */
  minLevel?: IgniterTelemetryLevel;

  /**
   * Custom username for the bot.
   * @default 'Igniter Telemetry'
   */
  username?: string;

  /**
   * Custom avatar URL.
   */
  avatarUrl?: string;
}

export class DiscordTransportAdapter implements IgniterTelemetryTransportAdapter {
  readonly type = "discord" as const;

  constructor(private config: DiscordTransportConfig) {}

  static create(config: DiscordTransportConfig): DiscordTransportAdapter {
    return new DiscordTransportAdapter(config);
  }

  async handle(envelope: IgniterTelemetryEnvelope): Promise<void> {
    if (!this.shouldNotify(envelope.level)) return;

    const color = this.getColor(envelope.level);
    const embed = this.buildEmbed(envelope, color);

    const payload = {
      username: this.config.username ?? "Igniter Telemetry",
      avatar_url: this.config.avatarUrl,
      embeds: [embed],
    };

    try {
      await fetch(this.config.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error("[IgniterTelemetry] Discord transport failed:", error);
    }
  }

  private shouldNotify(level: IgniterTelemetryLevel): boolean {
    const levels = ["debug", "info", "warn", "error"];
    const minLevel = this.config.minLevel ?? "error";
    return levels.indexOf(level) >= levels.indexOf(minLevel);
  }

  private getColor(level: IgniterTelemetryLevel): number {
    switch (level) {
      case "error":
        return 0xdc2626; // red
      case "warn":
        return 0xd97706; // orange
      case "info":
        return 0x2563eb; // blue
      case "debug":
        return 0x4b5563; // gray
      default:
        return 0x808080;
    }
  }

  private buildEmbed(envelope: IgniterTelemetryEnvelope, color: number): any {
    const fields = [
      { name: "Service", value: envelope.service, inline: true },
      { name: "Environment", value: envelope.environment, inline: true },
    ];

    if (envelope.actor) {
      fields.push({
        name: "Actor",
        value: `${envelope.actor.type}:${envelope.actor.id || "anon"}`,
        inline: true,
      });
    }

    let description = "";
    if (envelope.error) {
      description = `**Error:** ${envelope.error.message}\n\`\`\`ts\n${(envelope.error.stack || "").slice(0, 1000)}\n\`\`\``;
    } else if (envelope.attributes) {
      const json = JSON.stringify(envelope.attributes, null, 2);
      if (json.length < 1000) {
        description = `\`\`\`json\n${json}\n\`\`\``;
      }
    }

    return {
      title: `[${envelope.level.toUpperCase()}] ${envelope.name}`,
      color,
      fields,
      description,
      timestamp: envelope.time,
      footer: {
        text: `Session: ${envelope.sessionId}`,
      },
    };
  }
}
