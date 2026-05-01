/**
 * @fileoverview Builder for creating IgniterLoggerManager instances.
 * @module @igniter-js/logger/builders/main
 */

import type { IgniterLoggerBuilderState } from "../types/builder";
import type { IgniterLogLevel } from "../types/level";
import type { IgniterTransportConfig } from "../types/transport";
import { IgniterLoggerManager } from "../core/manager";

/**
 * Builder for creating {@link IgniterLoggerManager} instances.
 *
 * @typeParam TScopes - Typed scope shape for child loggers
 *
 * @example
 * ```typescript
 * import { IgniterLoggerBuilder, IgniterLogLevel } from "@igniter-js/logger";
 *
 * const logger = IgniterLoggerBuilder.create()
 *   .withLevel(IgniterLogLevel.Info)
 *   .withAppName("api")
 *   .withComponent("http")
 *   .withContext({ region: "us-east" })
 *   .build();
 * ```
 */
export class IgniterLoggerBuilder<TScopes = {}> {
  private readonly state: IgniterLoggerBuilderState;

  /**
   * Creates a new builder with the given state.
   *
   * @param state - Builder state to seed this instance
   */
  private constructor(state: IgniterLoggerBuilderState = {}) {
    this.state = state;
  }

  /**
   * Creates a new builder instance.
   *
   * @returns A new {@link IgniterLoggerBuilder} instance
   *
   * @example
   * ```typescript
   * const builder = IgniterLoggerBuilder.create()
   * ```
   */
  static create(): IgniterLoggerBuilder<{}> {
    return new IgniterLoggerBuilder({});
  }

  /**
   * Sets the minimum log level.
   *
   * @param level - Minimum log level for entries
   * @returns A new builder with the log level configured
   *
   * @example
   * ```typescript
   * const builder = IgniterLoggerBuilder.create().withLevel(IgniterLogLevel.Info)
   * ```
   */
  withLevel(level: IgniterLogLevel): IgniterLoggerBuilder<TScopes> {
    return new IgniterLoggerBuilder({ ...this.state, level });
  }

  /**
   * Sets the application name included in logs.
   *
   * @param appName - Application name label
   * @returns A new builder with the app name configured
   *
   * @example
   * ```typescript
   * const builder = IgniterLoggerBuilder.create().withAppName("web")
   * ```
   */
  withAppName(appName: string): IgniterLoggerBuilder<TScopes> {
    return new IgniterLoggerBuilder({ ...this.state, appName });
  }

  /**
   * Sets the component name included in logs.
   *
   * @param component - Component label for log entries
   * @returns A new builder with the component configured
   *
   * @example
   * ```typescript
   * const builder = IgniterLoggerBuilder.create().withComponent("worker")
   * ```
   */
  withComponent(component: string): IgniterLoggerBuilder<TScopes> {
    return new IgniterLoggerBuilder({ ...this.state, component });
  }

  /**
   * Merges default context into every log entry.
   *
   * @param context - Context data to merge
   * @returns A new builder with merged context
   *
   * @example
   * ```typescript
   * const builder = IgniterLoggerBuilder.create().withContext({ region: "eu" })
   * ```
   */
  withContext(
    context: Record<string, unknown>,
  ): IgniterLoggerBuilder<TScopes> {
    return new IgniterLoggerBuilder({
      ...this.state,
      context: { ...this.state.context, ...context },
    });
  }

  /**
   * Adds a transport configuration.
   *
   * @param transport - Transport configuration descriptor
   * @returns A new builder with the transport appended
   *
   * @example
   * ```typescript
   * const builder = IgniterLoggerBuilder.create().addTransport({
   *   target: "console",
   *   options: { pretty: true },
   * })
   * ```
   */
  addTransport(
    transport: IgniterTransportConfig,
  ): IgniterLoggerBuilder<TScopes> {
    return new IgniterLoggerBuilder({
      ...this.state,
      transports: [...(this.state.transports ?? []), transport],
    });
  }

  /**
   * Defines the generic scope shape for child loggers.
   *
   * @typeParam T - Scope object shape
   * @returns A new builder typed with the provided scope shape
   *
   * @example
   * ```typescript
   * const builder = IgniterLoggerBuilder.create().defineScopes<{
   *   tenantId: string
   * }>()
   * ```
   */
  defineScopes<T extends Record<string, unknown>>(): IgniterLoggerBuilder<T> {
    return new IgniterLoggerBuilder<T>(this.state);
  }

  /**
   * Builds the {@link IgniterLoggerManager} instance.
   *
   * If no transports were configured, a console transport with pretty
   * formatting is added by default.
   *
   * @returns The configured {@link IgniterLoggerManager} instance
   *
   * @example
   * ```typescript
   * const logger = IgniterLoggerBuilder.create().build()
   * ```
   */
  build(): IgniterLoggerManager<TScopes> {
    const transports = this.state.transports?.length
      ? this.state.transports
      : [{ target: "console" as const, options: { pretty: true } }];

    const finalState: IgniterLoggerBuilderState = {
      ...this.state,
      transports,
    };

    return new IgniterLoggerManager(finalState);
  }
}

/**
 * Alias for the public logger builder API.
 */
export const IgniterLogger = IgniterLoggerBuilder;
