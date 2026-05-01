/**
 * @fileoverview Manager implementation for @igniter-js/logger
 * @module @igniter-js/logger/core/manager
 */

import pino from "pino";
import type { IIgniterLoggerManager } from "../types/manager";
import type { IgniterLogLevel as CommonIgniterLogLevel } from "@igniter-js/common";
import type { IgniterLoggerConfig } from "../types/config";
import type { IgniterTransportConfig } from "../types/transport";
import type { IgniterLogLevel } from "../types/level";
import { resolveConsoleTransport } from "../transports/console.transport";
import { resolveFileTransport } from "../transports/file.transport";
import { resolveHttpTransport } from "../transports/http.transport";

/**
 * Pino-backed logger manager implementation.
 *
 * @typeParam TScopes - Scoped context typing
 */
export class IgniterLoggerManager<TScopes = {}>
  implements IIgniterLoggerManager
{
  private readonly config: IgniterLoggerConfig;
  protected pino: pino.Logger;
  private indentLevel = 0;

  /**
   * Creates a new logger manager instance.
   *
   * @param config - Logger configuration resolved by the builder
   */
  constructor(config: IgniterLoggerConfig) {
    this.config = config;

    const pinoTransports = this.resolvePinoTransports(
      config.transports ?? [],
    );

    this.pino = pino({
      level: config.level ?? "info",
      base: {
        appName: config.appName,
        component: config.component,
        ...config.context,
      },
      transport: pinoTransports.length > 0 ? { targets: pinoTransports } : undefined,
    });
  }

  /**
   * Logs a message at the specified level.
   *
   * @param level - The log level
   * @param message - The log message
   * @param context - Optional context payload
   * @param error - Optional error payload
   */
  log(
    level: IgniterLogLevel | CommonIgniterLogLevel,
    message: string,
    context?: Record<string, unknown> | string,
    error?: Error | unknown,
  ): void {
    const payload = this.mergeContext(context, error);
    const formattedMessage = this.formatMessage(message);

    switch (level) {
      case "fatal":
        this.pino.fatal(payload, formattedMessage);
        break;
      case "error":
        this.pino.error(payload, formattedMessage);
        break;
      case "warn":
        this.pino.warn(payload, formattedMessage);
        break;
      case "info":
        this.pino.info(payload, formattedMessage);
        break;
      case "debug":
        this.pino.debug(payload, formattedMessage);
        break;
      case "trace":
      default:
        this.pino.trace(payload, formattedMessage);
        break;
    }
  }

  /**
   * Log a fatal error message.
   *
   * @param message - The message to log
   * @param error - Optional error payload
   */
  fatal(message: string, error?: Error | unknown): void {
    this.pino.fatal(this.mergeContext(undefined, error), this.formatMessage(message));
  }

  /**
   * Log an error message.
   *
   * @param message - The message to log
   * @param error - Optional error payload
   */
  error(message: string, error?: Error | unknown): void {
    this.pino.error(this.mergeContext(undefined, error), this.formatMessage(message));
  }

  /**
   * Log a warning message.
   *
   * @param message - The message to log
   * @param args - Optional context arguments
   */
  warn(message: string, ...args: any[]): void {
    this.pino.warn(this.formatArgs(args), this.formatMessage(message));
  }

  /**
   * Log an informational message.
   *
   * @param message - The message to log
   * @param args - Optional context arguments
   */
  info(message: string, ...args: any[]): void {
    this.pino.info(this.formatArgs(args), this.formatMessage(message));
  }

  /**
   * Log a debug message.
   *
   * @param message - The message to log
   * @param args - Optional context arguments
   */
  debug(message: string, ...args: any[]): void {
    this.pino.debug(this.formatArgs(args), this.formatMessage(message));
  }

  /**
   * Log a trace message.
   *
   * @param message - The message to log
   * @param args - Optional context arguments
   */
  trace(message: string, ...args: any[]): void {
    this.pino.trace(this.formatArgs(args), this.formatMessage(message));
  }

  /**
   * Log a success message.
   *
   * @param message - The message to log
   * @param args - Optional context arguments
   */
  success(message: string, ...args: any[]): void {
    this.pino.info(
      { ...this.formatArgs(args), type: "success" },
      this.formatMessage(`✓ ${message}`),
    );
  }

  /**
   * Start a new log group (indentation).
   *
   * @param name - Optional group label
   */
  group(name?: string): void {
    if (name) {
      this.pino.info(this.formatMessage(`┌ ${name}`));
    }
    this.indentLevel += 1;
  }

  /**
   * End the current log group.
   */
  groupEnd(): void {
    if (this.indentLevel > 0) {
      this.indentLevel -= 1;
    }
  }

  /**
   * Create a separator in the log output.
   */
  separator(): void {
    this.pino.info(this.formatMessage("─".repeat(50)));
  }

  /**
   * Create a child logger with additional scoped context.
   *
   * @param componentName - Component name for the child logger
   * @param context - Optional context to merge
   * @returns The child logger instance
   */
  child(
    componentName: string,
    context?: Record<string, unknown> | string,
  ): IIgniterLoggerManager {
    const childContext =
      typeof context === "string" ? { label: context } : context;

    const childPino = this.pino.child({
      component: componentName,
      ...childContext,
    });

    const childManager = new IgniterLoggerManager<TScopes>({
      ...this.config,
      component: componentName,
      context: { ...this.config.context, ...childContext },
    });

    childManager.pino = childPino;

    return childManager;
  }

  /**
   * Set the minimum log level at runtime.
   *
   * @param level - Minimum log level
   */
  setLevel(level: IgniterLogLevel | CommonIgniterLogLevel): void {
    this.pino.level = level;
  }

  /**
   * Set application name to include in logs.
   *
   * @param appName - Application name
   */
  setAppName(appName: string | undefined): void {
    this.config.appName = appName;
  }

  /**
   * Set component name to include in logs.
   *
   * @param componentName - Component name
   */
  setComponent(componentName: string | undefined): void {
    this.config.component = componentName;
  }

  /**
   * Flush any buffered logs.
   */
  async flush(): Promise<void> {
    if (typeof this.pino.flush !== "function") return;

    await new Promise<void>((resolve, reject) => {
      this.pino.flush((error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  private resolvePinoTransports(transports: IgniterTransportConfig[]) {
    return transports.map((transport) => {
      if (transport.target === "console") {
        return resolveConsoleTransport(transport.options ?? ({} as any));
      }

      if (transport.target === "file") {
        return resolveFileTransport(transport.options ?? ({} as any));
      }

      if (transport.target === "http") {
        return resolveHttpTransport(transport.options ?? ({} as any));
      }

      return {
        target: transport.target,
        options: transport.options ?? {},
      };
    });
  }

  private mergeContext(
    context?: Record<string, unknown> | string,
    error?: Error | unknown,
  ): Record<string, unknown> {
    const baseContext = typeof context === "string" ? { label: context } : context;
    const payload = { ...(baseContext ?? {}) } as Record<string, unknown>;

    if (error) {
      payload.err = error;
    }

    return payload;
  }

  private formatArgs(args: any[]): Record<string, unknown> {
    if (args.length === 0) return {};
    if (args.length === 1 && typeof args[0] === "object") {
      return args[0];
    }
    return { extra: args };
  }

  private formatMessage(message: string): string {
    if (this.indentLevel === 0) return message;
    return `${"  ".repeat(this.indentLevel)}${message}`;
  }
}
