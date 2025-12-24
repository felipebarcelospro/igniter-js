/**
 * @fileoverview Telegram transport adapter for @igniter-js/telemetry
 * @module @igniter-js/telemetry/adapters/telegram
 */

import type { IgniterTelemetryTransportAdapter } from "../types/transport";
import type { IgniterTelemetryEnvelope } from "../types/envelope";
import type { IgniterTelemetryLevel } from "../types/levels";

export interface TelegramTransportConfig {
  /**
   * Telegram Bot Token.
   */
  botToken: string;

  /**
   * Chat ID to send messages to.
   */
  chatId: string;

  /**
   * Minimum level to notify.
   * @default 'error'
   */
  minLevel?: IgniterTelemetryLevel;
}

export class TelegramTransportAdapter implements IgniterTelemetryTransportAdapter {
  readonly type = "telegram" as const;

  constructor(private config: TelegramTransportConfig) {}

  static create(config: TelegramTransportConfig): TelegramTransportAdapter {
    return new TelegramTransportAdapter(config);
  }

  async handle(envelope: IgniterTelemetryEnvelope): Promise<void> {
    if (!this.shouldNotify(envelope.level)) return;

    const message = this.buildMessage(envelope);

    try {
      await fetch(
        `https://api.telegram.org/bot${this.config.botToken}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: this.config.chatId,
            text: message,
            parse_mode: "HTML",
          }),
        },
      );
    } catch (error) {
      console.error("[IgniterTelemetry] Telegram transport failed:", error);
    }
  }

  private shouldNotify(level: IgniterTelemetryLevel): boolean {
    const levels = ["debug", "info", "warn", "error"];
    const minLevel = this.config.minLevel ?? "error";
    return levels.indexOf(level) >= levels.indexOf(minLevel);
  }

  private buildMessage(envelope: IgniterTelemetryEnvelope): string {
    const icon = this.getIcon(envelope.level);
    let msg = `<b>${icon} [${envelope.level.toUpperCase()}] ${envelope.name}</b>\n\n`;

    msg += `<b>Service:</b> ${envelope.service}\n`;
    msg += `<b>Env:</b> ${envelope.environment}\n`;

    if (envelope.actor) {
      msg += `<b>Actor:</b> ${envelope.actor.type}:${envelope.actor.id || "anon"}\n`;
    }

    if (envelope.error) {
      msg += `\n<b>Error:</b> ${this.escapeHtml(envelope.error.message)}\n`;
      if (envelope.error.stack) {
        msg += `<pre>${this.escapeHtml(envelope.error.stack.slice(0, 500))}</pre>`;
      }
    } else if (envelope.attributes) {
      const json = JSON.stringify(envelope.attributes, null, 2);
      if (json.length < 500) {
        msg += `\n<pre>${this.escapeHtml(json)}</pre>`;
      }
    }

    return msg;
  }

  private getIcon(level: IgniterTelemetryLevel): string {
    switch (level) {
      case "error":
        return "🔴";
      case "warn":
        return "🟠";
      case "info":
        return "🔵";
      case "debug":
        return "⚪";
      default:
        return "📢";
    }
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
}
