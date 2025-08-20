/**
 * Console Telemetry Adapter for development and testing.
 * Provides a simple implementation that logs telemetry data to console.
 * 
 * @since 0.2.0
 */

import type { 
  IgniterTelemetryProvider, 
  IgniterTelemetrySpan, 
  IgniterTelemetryConfig,
  IgniterSpanOptions,
  IgniterTimer,
  IgniterSpanContext
} from "../types/telemetry.interface";
import type { IgniterStoreAdapter } from "../types/store.interface";
import { IgniterConsoleLogger } from "../services";
import { IgniterLogLevel, type IgniterLogger } from "../types";
import { resolveLogLevel, createLoggerContext } from "../utils/logger";

/**
 * Options for creating console telemetry adapter
 */
export interface ConsoleTelemetryOptions {
  /** Store adapter for publishing events to CLI */
  store?: IgniterStoreAdapter;
  /** Enable Redis pub/sub for CLI integration */
  enableCliIntegration?: boolean;
  /** Channel name for publishing telemetry events */
  channel?: string;
}

/**
 * Console implementation of telemetry span.
 */
class ConsoleTelemetrySpan implements IgniterTelemetrySpan {
  public readonly name: string;
  public readonly id: string;
  public readonly traceId: string;
  public readonly parentId?: string;
  public readonly startTime: number;
  public status: 'active' | 'completed' | 'error' = 'active';
  
  private tags: Record<string, string | number | boolean> = {};
  private events: Array<{ name: string; data?: any; timestamp: number }> = [];
  private error?: Error;

  constructor(
    name: string,
    options: IgniterSpanOptions = {},
    private provider: ConsoleTelemetryProvider
  ) {
    this.name = name;
    this.id = this.generateId();
    this.traceId = options.parent?.traceId || this.generateId();
    this.parentId = options.parent?.id;
    this.startTime = options.startTime || Date.now();
    
    if (options.tags) {
      this.tags = { ...options.tags };
    }

    try {
      const logger = new IgniterConsoleLogger({ 
        level: resolveLogLevel(), 
        context: createLoggerContext('TelemetrySpan') 
      });
      logger.debug(`🔍 [SPAN START] ${this.name} (${this.id})`);
    } catch {
      console.log(`🔍 [SPAN START] ${this.name} (${this.id})`);
    }
    
    // Publish to CLI if enabled
    this.provider.publishTelemetryEvent({
      id: this.id,
      timestamp: new Date(this.startTime),
      type: 'span',
      name: this.name,
      operation: (this.tags.operation as string) || 'custom',
      status: 'active',
      tags: this.tags,
      parentId: this.parentId,
      traceId: this.traceId
    });
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  setTag(key: string, value: string | number | boolean): void {
    this.tags[key] = value;
  }

  setTags(tags: Record<string, string | number | boolean>): void {
    Object.assign(this.tags, tags);
  }

  setError(error: Error): void {
    this.error = error;
    this.status = 'error';
    this.tags['error'] = true;
    this.tags['error.message'] = error.message;
    try {
      const logger = new IgniterConsoleLogger({ 
        level: resolveLogLevel(), 
        context: createLoggerContext('TelemetrySpan') 
      });
      logger.error(`❌ [SPAN ERROR] ${this.name}: ${error.message}`);
    } catch {
      console.error(`❌ [SPAN ERROR] ${this.name}: ${error.message}`);
    }
  }

  addEvent(name: string, data?: Record<string, any>): void {
    this.events.push({
      name,
      data,
      timestamp: Date.now()
    });
    try {
      const logger = new IgniterConsoleLogger({ 
        level: resolveLogLevel(), 
        context: createLoggerContext('TelemetrySpan') 
      });
      logger.debug(`📝 [SPAN EVENT] ${this.name}: ${name}`, { data });
    } catch {
      console.log(`📝 [SPAN EVENT] ${this.name}: ${name}`, data);
    }
  }

  finish(): void {
    this.status = this.status === 'error' ? 'error' : 'completed';
    const duration = Date.now() - this.startTime;
    
    const statusIcon = this.status === 'completed' ? '✅' : '❌';
    try {
      const logger = new IgniterConsoleLogger({ 
        level: resolveLogLevel(), 
        context: createLoggerContext('TelemetrySpan') 
      });
      logger.debug(`${statusIcon} [SPAN END] ${this.name} (${duration}ms)`, {
        id: this.id,
        traceId: this.traceId,
        parentId: this.parentId,
        duration,
        tags: this.tags,
        events: this.events.length,
        error: this.error?.message
      });
    } catch {
      console.log(`${statusIcon} [SPAN END] ${this.name} (${duration}ms)`, {
        id: this.id,
        traceId: this.traceId,
        parentId: this.parentId,
        duration,
        tags: this.tags,
        events: this.events.length,
        error: this.error?.message
      });
    }

    // Publish completion to CLI if enabled
    this.provider.publishTelemetryEvent({
      id: this.id,
      timestamp: new Date(),
      type: 'span',
      name: this.name,
      operation: (this.tags.operation as string) || 'custom',
      status: this.status,
      duration,
      tags: this.tags,
      parentId: this.parentId,
      traceId: this.traceId,
      error: this.error?.message
    });
  }

  child(name: string, options?: IgniterSpanOptions): IgniterTelemetrySpan {
    return new ConsoleTelemetrySpan(name, {
      ...options,
      parent: this
    }, this.provider);
  }

  getContext(): IgniterSpanContext {
    return {
      traceId: this.traceId,
      spanId: this.id,
      traceFlags: 1,
      baggage: {}
    };
  }
}

/**
 * Console implementation of telemetry timer.
 */
class ConsoleTelemetryTimer implements IgniterTimer {
  public readonly name: string;
  public readonly startTime: number;
  public readonly tags: Record<string, string>;

  constructor(name: string, tags: Record<string, string> = {}) {
    this.name = name;
    this.startTime = Date.now();
    this.tags = tags;
  }

  finish(additionalTags?: Record<string, string>): void {
    const duration = this.getDuration();
    const allTags = { ...this.tags, ...additionalTags };
    try {
      const logger = new IgniterConsoleLogger({ 
        level: resolveLogLevel(), 
        context: createLoggerContext('TelemetryTimer') 
      });
      logger.debug(`⏱️ [TIMER] ${this.name}: ${duration}ms`, { tags: allTags });
    } catch {
      console.log(`⏱️ [TIMER] ${this.name}: ${duration}ms`, allTags);
    }
  }

  getDuration(): number {
    return Date.now() - this.startTime;
  }
}

/**
 * Console telemetry provider implementation.
 */
class ConsoleTelemetryProvider implements IgniterTelemetryProvider {
  public readonly config: IgniterTelemetryConfig;
  public readonly name = 'console';
  public readonly status: 'active' | 'inactive' | 'error' = 'active';
  
  private activeSpan: IgniterTelemetrySpan | null = null;
  private spanStack: IgniterTelemetrySpan[] = [];
  private store?: IgniterStoreAdapter;
  private enableCliIntegration: boolean;
  private channel: string;
  private logger: IgniterLogger = new IgniterConsoleLogger({
    level: resolveLogLevel(),
    context: createLoggerContext('ConsoleTelemetryProvider')
  })

  constructor(
    config: IgniterTelemetryConfig, 
    options: ConsoleTelemetryOptions = {}
  ) {
    this.config = {
      enableTracing: true,
      enableMetrics: true,
      enableEvents: true,
      sampleRate: 1.0,
      ...config
    };

    this.store = options.store;
    this.enableCliIntegration = options.enableCliIntegration ?? true;
    this.channel = options.channel ?? 'igniter:telemetry';

    this.logger.info('Console telemetry provider initialized', {
      serviceName: this.config.serviceName,
      environment: this.config.environment,
      features: {
        tracing: this.config.enableTracing,
        metrics: this.config.enableMetrics,
        events: this.config.enableEvents
      },
      cliIntegration: this.enableCliIntegration && !!this.store
    });
  }

  // ==========================================
  // TRACING
  // ==========================================

  startSpan(name: string, options?: IgniterSpanOptions): IgniterTelemetrySpan {
    if (!this.config.enableTracing) {
      return new ConsoleTelemetrySpan(name, options, this);
    }

    const span = new ConsoleTelemetrySpan(name, options, this);
    this.spanStack.push(span);
    this.activeSpan = span;
    return span;
  }

  getActiveSpan(): IgniterTelemetrySpan | null {
    return this.activeSpan;
  }

  setActiveSpan(span: IgniterTelemetrySpan): void {
    this.activeSpan = span;
  }

  withActiveSpan<T>(span: IgniterTelemetrySpan, fn: () => T): T {
    const previousSpan = this.activeSpan;
    this.activeSpan = span;
    try {
      return fn();
    } finally {
      this.activeSpan = previousSpan;
    }
  }

  // ==========================================
  // METRICS
  // ==========================================

  increment(metric: string, value: number = 1, tags?: Record<string, string>): void {
    if (!this.config.enableMetrics) return;
    this.logger.debug(`[COUNTER] ${metric}: +${value}`, tags);
    
    this.publishTelemetryMetric({
      name: metric,
      type: 'counter',
      value,
      tags: tags || {},
      timestamp: new Date()
    });
  }

  decrement(metric: string, value: number = 1, tags?: Record<string, string>): void {
    if (!this.config.enableMetrics) return;
    this.logger.debug(`[COUNTER] ${metric}: -${value}`, tags);
  }

  histogram(metric: string, value: number, tags?: Record<string, string>): void {
    if (!this.config.enableMetrics) return;
    this.logger.debug(`[HISTOGRAM] ${metric}: ${value}`, tags);
  }

  gauge(metric: string, value: number, tags?: Record<string, string>): void {
    if (!this.config.enableMetrics) return;
    this.logger.debug(`[GAUGE] ${metric}: ${value}`, tags);
  }

  timer(metric: string, tags?: Record<string, string>): IgniterTimer {
    return new ConsoleTelemetryTimer(metric, tags);
  }

  timing(metric: string, duration: number, tags?: Record<string, string>): void {
    if (!this.config.enableMetrics) return;
    this.logger.debug(`[TIMING] ${metric}: ${duration}ms`, tags);
  }

  // ==========================================
  // EVENTS & LOGS
  // ==========================================

  event(name: string, data: Record<string, any>, level: 'debug' | 'info' | 'warn' | 'error' = 'info'): void {
    if (!this.config.enableEvents) return;
    const icon = level === 'error' ? '🚨' : level === 'warn' ? '⚠️' : '📝';
    this.logger.debug(`[EVENT] ${name}`, data);
    
    this.publishTelemetryEvent({
      id: Math.random().toString(36).substring(2, 15),
      timestamp: new Date(),
      type: 'event',
      name,
      operation: 'custom',
      status: level === 'error' ? 'failed' : 'completed',
      tags: { level, ...data }
    });
  }

  error(error: Error, context?: Record<string, any>): void {
    this.logger.error(`[ERROR] ${error.message}`, context);
  }

  warn(message: string, context?: Record<string, any>): void {
    this.logger.warn(`[WARN] ${message}`, context);
  }

  info(message: string, context?: Record<string, any>): void {
    this.logger.info(`[INFO] ${message}`, context);
  }

  debug(message: string, context?: Record<string, any>): void {
    this.logger.debug(`[DEBUG] ${message}`, context);
  }

  // ==========================================
  // LIFECYCLE
  // ==========================================

  async flush(): Promise<void> {
    this.logger.debug('Flushing data...');
    // In console provider, nothing to flush
  }

  async shutdown(): Promise<void> {
    this.logger.debug('Shutting down...');
    this.activeSpan = null;
    this.spanStack = [];
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details?: any }> {
    return {
      status: 'healthy',
      details: {
        provider: this.name,
        activeSpans: this.spanStack.length,
        config: this.config
      }
    };
  }

  // ==========================================
  // CLI INTEGRATION
  // ==========================================

  /**
   * Publish telemetry event to CLI via Redis
   */
  publishTelemetryEvent(event: any): void {
    if (!this.enableCliIntegration || !this.store) return;

    try {
      this.store.publish(this.channel, {
        type: 'telemetry-event',
        data: event
      }).catch(error => {
        this.logger.warn(`Failed to publish event to CLI: ${error.message}`);
      });
    } catch (error) {
      this.logger.warn(`Error publishing to CLI: ${error}`);
    }
  }

  /**
   * Publish telemetry metric to CLI via Redis
   */
  publishTelemetryMetric(metric: any): void {
    if (!this.enableCliIntegration || !this.store) return;

    try {
      this.store.publish(this.channel, {
        type: 'telemetry-metric',
        data: metric
      }).catch(error => {
        this.logger.warn(`Failed to publish metric to CLI: ${error.message}`);
      });
    } catch (error) {
      this.logger.warn(`Error publishing metric to CLI: ${error}`);
    }
  }
}

/**
 * Factory function to create a console telemetry provider.
 * 
 * @param config - Telemetry configuration
 * @returns Console telemetry provider instance
 * 
 * @example
 * ```typescript
 * const telemetry = createConsoleTelemetryAdapter({
 *   serviceName: 'my-api',
 *   environment: 'development'
 * });
 * 
 * const igniter = Igniter
 *   .context<{ db: Database }>()
 *   .telemetry(telemetry)
 *   .create();
 * ```
 */
export function createConsoleTelemetryAdapter(
  config: IgniterTelemetryConfig,
  options?: ConsoleTelemetryOptions
): IgniterTelemetryProvider {
  return new ConsoleTelemetryProvider(config, options);
}