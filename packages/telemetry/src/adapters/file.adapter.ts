/**
 * @fileoverview File transport adapter for @igniter-js/telemetry
 * @module @igniter-js/telemetry/adapters/file
 */

import { existsSync, mkdirSync, appendFileSync } from "node:fs";
import { dirname } from "node:path";
import type {
  IgniterTelemetryTransportAdapter,
  IgniterTelemetryTransportMeta,
} from "../types/transport";
import type { IgniterTelemetryEnvelope } from "../types/envelope";

export interface FileTransportConfig {
  /**
   * Path to the log file.
   * Directories will be created if they don't exist.
   * @example './logs/telemetry.log'
   */
  path: string;
}

export class FileTransportAdapter implements IgniterTelemetryTransportAdapter {
  readonly type = "file" as const;

  constructor(private config: FileTransportConfig) {}

  static create(config: FileTransportConfig): FileTransportAdapter {
    return new FileTransportAdapter(config);
  }

  init(meta: IgniterTelemetryTransportMeta): void {
    const dir = dirname(this.config.path);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  handle(envelope: IgniterTelemetryEnvelope): void {
    try {
      const line = JSON.stringify(envelope) + "\n";
      appendFileSync(this.config.path, line, "utf8");
    } catch (err) {
      console.error("[IgniterTelemetry] Failed to write to file:", err);
    }
  }
}
