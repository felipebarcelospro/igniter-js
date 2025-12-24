/**
 * @fileoverview Slack transport adapter for @igniter-js/telemetry
 * @module @igniter-js/telemetry/adapters/slack
 */

import type { IgniterTelemetryTransportAdapter } from "../types/transport";
import type { IgniterTelemetryEnvelope } from "../types/envelope";
import type { IgniterTelemetryLevel } from "../types/levels";

export interface SlackTransportConfig {
  /**
   * The Slack Incoming Webhook URL.
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
   * Custom icon emoji.
   * @default ':fire:'
   */
  iconEmoji?: string;
}

export class SlackTransportAdapter implements IgniterTelemetryTransportAdapter {
  readonly type = "slack" as const;

  constructor(private config: SlackTransportConfig) {}

  static create(config: SlackTransportConfig): SlackTransportAdapter {
    return new SlackTransportAdapter(config);
  }

  async handle(envelope: IgniterTelemetryEnvelope): Promise<void> {
    if (!this.shouldNotify(envelope.level)) return;

    const color = this.getColor(envelope.level);
    const blocks = this.buildBlocks(envelope);

    const payload = {
      username: this.config.username ?? "Igniter Telemetry",
      icon_emoji: this.config.iconEmoji ?? ":fire:",
      attachments: [
        {
          color,
          blocks,
        },
      ],
    };

    try {
      await fetch(this.config.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error("[IgniterTelemetry] Slack transport failed:", error);
    }
  }

  private shouldNotify(level: IgniterTelemetryLevel): boolean {
    const levels = ["debug", "info", "warn", "error"];
    const minLevel = this.config.minLevel ?? "error";
    return levels.indexOf(level) >= levels.indexOf(minLevel);
  }

  private getColor(level: IgniterTelemetryLevel): string {
    switch (level) {
      case "error":
        return "#dc2626"; // red-600
      case "warn":
        return "#d97706"; // amber-600
      case "info":
        return "#2563eb"; // blue-600
      case "debug":
        return "#4b5563"; // gray-600
      default:
        return "#808080";
    }
  }

  private buildBlocks(envelope: IgniterTelemetryEnvelope): any[] {
    const header = {
      type: "header",
      text: {
        type: "plain_text",
        text: `[${envelope.level.toUpperCase()}] ${envelope.name}`,
        emoji: true,
      },
    };

    const fields = [
      `*Service:* ${envelope.service}`,
      `*Env:* ${envelope.environment}`,
    ];

    if (envelope.actor) {
      fields.push(
        `*Actor:* ${envelope.actor.type}:${envelope.actor.id || "anon"}`,
      );
    }

    const contextSection = {
      type: "section",
      fields: fields.map((text) => ({ type: "mrkdwn", text })),
    };

    const blocks = [header, contextSection];

    if (envelope.error) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Error:* ${envelope.error.message}\n\`\`\`${envelope.error.stack || "No stack trace"}\`\`\``,
          emoji: true,
        },
      });
    } else if (
      envelope.attributes &&
      Object.keys(envelope.attributes).length > 0
    ) {
      // Only show attributes if it's not an error (errors already show stack)
      // or if we want to be verbose. Keeping it simple for now.
      const json = JSON.stringify(envelope.attributes, null, 2);
      if (json.length < 2000) {
        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Attributes:*\n\`\`\`${json}\`\`\``,
            emoji: true,
          },
        });
      }
    }

    return blocks;
  }
}
