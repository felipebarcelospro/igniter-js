import type {
  IgniterTelemetryProvider,
  IgniterTelemetryConfig,
  IgniterLogger,
} from '@igniter-js/core';

/**
 * OpenTelemetry exporter types
 */
export type OpenTelemetryExporter = 'console' | 'jaeger' | 'otlp' | 'prometheus';

/**
 * OpenTelemetry specific configuration
 */
export interface OpenTelemetryConfig extends IgniterTelemetryConfig {
  /** Logger */
  logger?: IgniterLogger;
  
  /** OpenTelemetry exporters to use */
  exporters?: OpenTelemetryExporter[];
  
  /** Jaeger configuration */
  jaeger?: {
    host?: string;
    endpoint?: string;
    serviceName?: string;
  };
  
  /** OTLP configuration */
  otlp?: {
    host?: string;
    endpoint?: string;
    headers?: Record<string, string>;
  };
  
  /** Prometheus configuration */
  prometheus?: {
    host?: string;
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

  /** Initialize the OpenTelemetry adapter */
  initialize(): Promise<void>;
} 