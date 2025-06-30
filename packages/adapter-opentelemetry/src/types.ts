import type {
  IgniterTelemetryProvider,
  IgniterTelemetryConfig,
} from '@igniter-js/core';

/**
 * OpenTelemetry exporter types
 */
export type OpenTelemetryExporter = 'console' | 'jaeger' | 'otlp' | 'prometheus';

/**
 * OpenTelemetry specific configuration
 */
export interface OpenTelemetryConfig extends IgniterTelemetryConfig {
  /** OpenTelemetry exporters to use */
  exporters?: OpenTelemetryExporter[];
  
  /** Jaeger configuration */
  jaeger?: {
    endpoint?: string;
    serviceName?: string;
  };
  
  /** OTLP configuration */
  otlp?: {
    endpoint?: string;
    headers?: Record<string, string>;
  };
  
  /** Prometheus configuration */
  prometheus?: {
    endpoint?: string;
    port?: number;
  };
  
  /** Resource attributes */
  resource?: Record<string, string>;
  
  /** Instrumentation configuration */
  instrumentation?: {
    http?: boolean;
    fs?: boolean;
    dns?: boolean;
  };
}

/**
 * Factory function options for creating OpenTelemetry adapter
 */
export interface CreateOpenTelemetryAdapterOptions {
  /** OpenTelemetry configuration */
  config: OpenTelemetryConfig;
  
  /** Auto-initialize SDK (default: true) */
  autoInit?: boolean;
  
  /** Graceful shutdown timeout in ms (default: 5000) */
  shutdownTimeout?: number;
}

/**
 * OpenTelemetry adapter interface extending base telemetry provider
 */
export interface OpenTelemetryAdapter extends IgniterTelemetryProvider {
  /** OpenTelemetry specific configuration */
  readonly config: OpenTelemetryConfig;
  
  /** Get the underlying OpenTelemetry tracer */
  getTracer(): any;
  
  /** Get the underlying OpenTelemetry meter */
  getMeter(): any;
  
  /** Force flush all pending telemetry data */
  forceFlush(): Promise<void>;
} 