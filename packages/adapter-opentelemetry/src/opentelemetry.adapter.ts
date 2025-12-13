import { type IgniterTelemetrySpan, type IgniterTimer, type IgniterSpanOptions, type IgniterLogger } from '@igniter-js/core';
import { OpenTelemetrySpanWrapper } from './span';
import { OpenTelemetryTimer, NoOpTimer } from './timer';
import type { OpenTelemetryConfig, OpenTelemetryAdapter } from './types';


/**
 * OpenTelemetry adapter implementation for Igniter.js telemetry system
 */
export class OpenTelemetryAdapterImpl implements OpenTelemetryAdapter {
  private _config: OpenTelemetryConfig;
  private _tracer: any;
  private _meter: any;
  private _sdk: any;
  private _isInitialized = false;
  private _counters = new Map<string, any>();
  private _histograms = new Map<string, any>();
  private _gauges = new Map<string, any>();
  private _activeSpan: IgniterTelemetrySpan | null = null;
  private _logger?: IgniterLogger;

  constructor(config: OpenTelemetryConfig) {
    this._config = {
      enableTracing: true,
      enableMetrics: true,
      enableEvents: true,
      sampleRate: 1.0,
      ...config,
    };
  }

  get config(): OpenTelemetryConfig {
    return this._config;
  }

  get name(): string {
    return 'opentelemetry';
  }

  get status(): 'active' | 'inactive' | 'error' {
    return this._isInitialized ? 'active' : 'inactive';
  }

  /**
   * Initialize OpenTelemetry SDK with dynamic imports
   */
  async initialize(): Promise<void> {
    if (this._isInitialized) {
      return;
    }

    try {
      const { NodeSDK } = await import('@opentelemetry/sdk-node');
      const { getNodeAutoInstrumentations } = await import('@opentelemetry/auto-instrumentations-node');
      const { resourceFromAttributes } = await import('@opentelemetry/resources');
      const { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } = await import('@opentelemetry/semantic-conventions');

      // Configure resource
      const resource = resourceFromAttributes({
        [ATTR_SERVICE_NAME]: this._config.serviceName,
        [ATTR_SERVICE_VERSION]: this._config.serviceVersion || '1.0.0',
        ...this._config.resource,
      });
      
      // Configure exporters
      const traceExporters = await this._configureTraceExporters();
      const metricExporters = await this._configureMetricExporters();

      // Initialize SDK
      this._sdk = new NodeSDK({
        serviceName: this._config.serviceName,
        resource,
        traceExporter: traceExporters.length > 0 ? traceExporters[0] : undefined,
        metricReader: metricExporters.length > 0 ? metricExporters[0] : undefined,
        instrumentations: [
          getNodeAutoInstrumentations({
            "@opentelemetry/instrumentation-fs": {
              enabled: this._config.instrumentation?.fs ?? false,
            },
            "@opentelemetry/instrumentation-dns": {
              enabled: this._config.instrumentation?.dns ?? false,
            },
            "@opentelemetry/instrumentation-http": {
              enabled: this._config.instrumentation?.http ?? true,
            },
          }),
        ],
      });

      this._sdk.start();

      // Get tracer and meter
      try {
        const { trace, metrics } = await import('@opentelemetry/api');
        this._tracer = trace.getTracer(this._config.serviceName, this._config.serviceVersion);
        this._meter = metrics.getMeter(this._config.serviceName, this._config.serviceVersion);
        this._isInitialized = true;
        this._logger?.info(`Initialized for service: ${this._config.serviceName}`);
      } catch (error) {
        this._logger?.warn('API not available. Continuing in no-op mode.');
        this._logger?.warn('Failed to initialize:', error);
      }
    } catch (error) {
      this._logger?.warn('Failed to initialize:', error);
      // Continue without telemetry - graceful degradation
    }
  }

  // TRACING METHODS

  startSpan(name: string, options?: IgniterSpanOptions): IgniterTelemetrySpan {
    if (!this._isInitialized || !this._config.enableTracing) {
      return this._createNoOpSpan(name);
    }

    try {
      const spanOptions: any = {
        attributes: options?.tags,
        startTime: options?.startTime,
      };

      if (options?.parent) {
        // Set parent context if provided
        spanOptions.parent = (options.parent as any).getOtelSpan?.() || options.parent;
      }

      const span = this._tracer.startSpan(name, spanOptions);
      return new OpenTelemetrySpanWrapper(span, this._tracer);
    } catch (error) {
      this._logger?.warn(`Failed to start span ${name}:`, error);
      return this._createNoOpSpan(name);
    }
  }

  getActiveSpan(): IgniterTelemetrySpan | null {
    return this._activeSpan;
  }

  setActiveSpan(span: IgniterTelemetrySpan): void {
    this._activeSpan = span;
  }

  withActiveSpan<T>(span: IgniterTelemetrySpan, fn: () => T): T {
    const previousSpan = this._activeSpan;
    this._activeSpan = span;
    try {
      return fn();
    } finally {
      this._activeSpan = previousSpan;
    }
  }

  // METRICS METHODS

  increment(metric: string, value = 1, tags: Record<string, string> = {}): void {
    if (!this._isInitialized || !this._config.enableMetrics) {
      return;
    }

    try {
      let counter = this._counters.get(metric);
      if (!counter) {
        counter = this._meter.createCounter(metric, {
          description: `Counter for ${metric}`,
        });
        this._counters.set(metric, counter);
      }

      counter.add(value, tags);
    } catch (error) {
      this._logger?.warn(`Failed to increment ${metric}:`, error);
    }
  }

  decrement(metric: string, value = 1, tags: Record<string, string> = {}): void {
    // OpenTelemetry doesn't have decrement, so we use negative increment
    this.increment(metric, -value, tags);
  }

  histogram(metric: string, value: number, tags: Record<string, string> = {}): void {
    if (!this._isInitialized || !this._config.enableMetrics) {
      return;
    }

    try {
      let histogram = this._histograms.get(metric);
      if (!histogram) {
        histogram = this._meter.createHistogram(metric, {
          description: `Histogram for ${metric}`,
        });
        this._histograms.set(metric, histogram);
      }

      histogram.record(value, tags);
    } catch (error) {
      this._logger?.warn(`Failed to record histogram ${metric}:`, error);
    }
  }

  gauge(metric: string, value: number, tags: Record<string, string> = {}): void {
    if (!this._isInitialized || !this._config.enableMetrics) {
      return;
    }

    try {
      let gauge = this._gauges.get(metric);
      if (!gauge) {
        gauge = this._meter.createObservableGauge(metric, {
          description: `Gauge for ${metric}`,
        });
        this._gauges.set(metric, gauge);
      }

      // For gauges, we need to use the callback pattern in OpenTelemetry
      // This is a simplified implementation
      gauge.addCallback((result: any) => {
        result.observe(value, tags);
      });
    } catch (error) {
      this._logger?.warn(`Failed to set gauge ${metric}:`, error);
    }
  }

  timer(metric: string, tags: Record<string, string> = {}): IgniterTimer {
    if (!this._isInitialized || !this._config.enableMetrics) {
      return new NoOpTimer(metric);
    }

    try {
      return new OpenTelemetryTimer(metric, this._meter, tags);
    } catch (error) {
      this._logger?.warn(`Failed to create timer ${metric}:`, error);
      return new NoOpTimer(metric);
    }
  }

  timing(metric: string, duration: number, tags: Record<string, string> = {}): void {
    this.histogram(`${metric}.duration`, duration, tags);
  }

  // EVENTS METHODS

  event(name: string, data: Record<string, any>, level: 'debug' | 'info' | 'warn' | 'error' = 'info'): void {
    if (!this._isInitialized || !this._config.enableEvents) {
      return;
    }

    try {
      // OpenTelemetry doesn't have a dedicated events API
      // We can use spans with events or logs
      const span = this._tracer.startSpan(`event.${name}`);
      span.addEvent(name, { ...data, level });
      span.end();
    } catch (error) {
      this._logger?.warn(`Failed to record event ${name}:`, error);
    }
  }

  error(error: Error, context?: Record<string, any>): void {
    this.event('error', { 
      message: error.message, 
      stack: error.stack, 
      name: error.name,
      ...context 
    }, 'error');
  }

  warn(message: string, context?: Record<string, any>): void {
    this.event('warning', { message, ...context }, 'warn');
  }

  info(message: string, context?: Record<string, any>): void {
    this.event('info', { message, ...context }, 'info');
  }

  debug(message: string, context?: Record<string, any>): void {
    this.event('debug', { message, ...context }, 'debug');
  }

  // LIFECYCLE METHODS

  async flush(): Promise<void> {
    if (!this._isInitialized) {
      return;
    }

    try {
      await this._sdk?.flush?.();
    } catch (error) {
      this._logger?.warn('Failed to flush:', error);
    }
  }

  async forceFlush(): Promise<void> {
    return this.flush();
  }

  async shutdown(): Promise<void> {
    if (!this._isInitialized) {
      return;
    }

    try {
      await this._sdk?.shutdown?.();
      this._isInitialized = false;
      this._logger?.info('Shutdown completed');
    } catch (error) {
      this._logger?.warn('Failed to shutdown:', error);
    }
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details?: any }> {
    if (!this._isInitialized) {
      return {
        status: 'unhealthy',
        details: { reason: 'Not initialized' }
      };
    }

    try {
      // Basic health check - try to create a test span
      const testSpan = this.startSpan('health-check');
      testSpan.finish();
      
      return {
        status: 'healthy',
        details: {
          initialized: true,
          tracingEnabled: this._config.enableTracing,
          metricsEnabled: this._config.enableMetrics,
          eventsEnabled: this._config.enableEvents
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  // OPENTELEMETRY SPECIFIC METHODS

  getTracer(): any {
    return this._tracer;
  }

  getMeter(): any {
    return this._meter;
  }

  // PRIVATE METHODS

  private async _configureTraceExporters(): Promise<any[]> {
    const exporters: any[] = [];

    for (const exporterType of this._config.exporters || []) {
      try {
        switch (exporterType) {
          case 'jaeger':
            try {
              const { JaegerExporter } = await import('@opentelemetry/exporter-jaeger');
              exporters.push(new JaegerExporter({
                endpoint: this._config.jaeger?.endpoint || 'http://localhost:14268/api/traces',
              }));
            } catch {
              this._logger?.warn(`${exporterType} exporter not available`);
            }
            break;

          case 'otlp':
            try {
              const { OTLPTraceExporter } = await import('@opentelemetry/exporter-otlp-http');
              exporters.push(new OTLPTraceExporter({
                url: this._config.otlp?.endpoint || 'http://localhost:4318/v1/traces',
                headers: this._config.otlp?.headers,
              }));
            } catch {
              this._logger?.warn(`${exporterType} exporter not available`);
            }
            break;
        }
      } catch (error) {
        this._logger?.warn(`Failed to configure ${exporterType} trace exporter:`, error);
      }
    }

    return exporters;
  }

  private async _configureMetricExporters(): Promise<any[]> {
    const exporters: any[] = [];

    for (const exporterType of this._config.exporters || []) {
      try {
        switch (exporterType) {
          case 'console':
            try {
              const { ConsoleMetricExporter, PeriodicExportingMetricReader } = await import('@opentelemetry/sdk-metrics');
              exporters.push(new PeriodicExportingMetricReader({
                exporter: new ConsoleMetricExporter(),
                exportIntervalMillis: 5000,
              }));
            } catch {
              this._logger?.warn(`${exporterType} metric exporter not available`);
            }
            break;

          case 'prometheus':
            try {
              const { PrometheusExporter } = await import('@opentelemetry/exporter-prometheus');
              exporters.push(new PrometheusExporter({
                host: this._config.prometheus?.host,
                port: this._config.prometheus?.port,
                endpoint: this._config.prometheus?.endpoint,
              }));
            } catch {
              this._logger?.warn(`${exporterType} metric exporter not available`);
            }
            break;
        }
      } catch (error) {
        this._logger?.warn(`Failed to configure ${exporterType} metric exporter:`, error);
      }
    }

    return exporters;
  }

  private _createNoOpSpan(name: string): IgniterTelemetrySpan {
    return {
      name,
      id: 'noop',
      traceId: 'noop',
      parentId: undefined,
      startTime: Date.now(),
      status: 'active' as const,
      setTag: () => {},
      setTags: () => {},
      setError: () => {},
      addEvent: () => {},
      finish: () => {},
      child: (childName: string) => this._createNoOpSpan(childName),
      getContext: () => ({
        traceId: 'noop',
        spanId: 'noop',
        traceFlags: 0,
      }),
    };
  }
}