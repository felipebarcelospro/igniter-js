import { OpenTelemetryAdapterImpl } from './opentelemetry.adapter';
import type {
  OpenTelemetryConfig,
  OpenTelemetryAdapter,
  CreateOpenTelemetryAdapterOptions,
} from './types';

/**
 * Creates an OpenTelemetry adapter for Igniter.js telemetry system
 * 
 * @param options - Configuration options for the OpenTelemetry adapter
 * @returns Promise resolving to configured OpenTelemetry adapter
 * 
 * @example
 * ```typescript
 * // Basic usage with console exporter
 * const telemetry = await createOpenTelemetryAdapter({
 *   config: {
 *     serviceName: 'my-api',
 *     environment: 'development',
 *     exporters: ['console']
 *   }
 * });
 * 
 * // Production usage with Jaeger
 * const telemetry = await createOpenTelemetryAdapter({
 *   config: {
 *     serviceName: 'my-api',
 *     environment: 'production',
 *     exporters: ['jaeger'],
 *     jaeger: {
 *       endpoint: 'http://jaeger:14268/api/traces'
 *     },
 *     sampleRate: 0.1 // 10% sampling in production
 *   }
 * });
 * 
 * // Use with Igniter
 * const igniter = Igniter
 *   .context<{ db: Database }>()
 *   .telemetry(telemetry)
 *   .create();
 * ```
 */
export async function createOpenTelemetryAdapter(
  options: CreateOpenTelemetryAdapterOptions
): Promise<OpenTelemetryAdapter> {
  const {
    config,
    autoInit = true,
    shutdownTimeout = 5000,
  } = options;

  // Validate required configuration
  if (!config.serviceName) {
    throw new Error('[OpenTelemetry] serviceName is required in config');
  }

  // Create adapter instance
  const adapter = new OpenTelemetryAdapterImpl(config);

  // Auto-initialize if requested
  if (autoInit) {
    await adapter.initialize();

    // Setup graceful shutdown
    const shutdownHandler = async () => {
      console.log('[OpenTelemetry] Graceful shutdown initiated...');
      
      const shutdownPromise = adapter.shutdown();
      const timeoutPromise = new Promise<void>((resolve) => {
        setTimeout(() => {
          console.warn(`[OpenTelemetry] Shutdown timeout after ${shutdownTimeout}ms`);
          resolve();
        }, shutdownTimeout);
      });

      await Promise.race([shutdownPromise, timeoutPromise]);
    };

    // Register shutdown handlers
    process.on('SIGTERM', shutdownHandler);
    process.on('SIGINT', shutdownHandler);
    process.on('SIGUSR2', shutdownHandler); // For nodemon
  }

  return adapter;
}

/**
 * Creates a simple OpenTelemetry adapter with console exporter for development
 * 
 * @param serviceName - Name of the service
 * @param environment - Environment (default: 'development')
 * @returns Promise resolving to configured adapter
 * 
 * @example
 * ```typescript
 * const telemetry = await createSimpleOpenTelemetryAdapter('my-api');
 * 
 * const igniter = Igniter
 *   .context<MyContext>()
 *   .telemetry(telemetry)
 *   .create();
 * ```
 */
export async function createSimpleOpenTelemetryAdapter(
  serviceName: string,
  environment: 'development' | 'staging' | 'production' = 'development'
): Promise<OpenTelemetryAdapter> {
  return createOpenTelemetryAdapter({
    config: {
      serviceName,
      environment,
      exporters: ['console'],
      enableTracing: true,
      enableMetrics: true,
      enableEvents: true,
      sampleRate: environment === 'production' ? 0.1 : 1.0,
    },
  });
}

/**
 * Creates an OpenTelemetry adapter configured for production with Jaeger
 * 
 * @param config - Production configuration
 * @returns Promise resolving to configured adapter
 * 
 * @example
 * ```typescript
 * const telemetry = await createProductionOpenTelemetryAdapter({
 *   serviceName: 'my-api',
 *   jaegerEndpoint: 'http://jaeger:14268/api/traces',
 *   sampleRate: 0.05 // 5% sampling
 * });
 * ```
 */
export async function createProductionOpenTelemetryAdapter(config: {
  serviceName: string;
  serviceVersion?: string;
  jaegerEndpoint?: string;
  otlpEndpoint?: string;
  sampleRate?: number;
  resource?: Record<string, string>;
}): Promise<OpenTelemetryAdapter> {
  const exporters: ('jaeger' | 'otlp')[] = [];
  
  const telemetryConfig: OpenTelemetryConfig = {
    serviceName: config.serviceName,
    serviceVersion: config.serviceVersion,
    environment: 'production',
    enableTracing: true,
    enableMetrics: true,
    enableEvents: true,
    sampleRate: config.sampleRate || 0.1,
    resource: config.resource,
    exporters,
  };

  // Configure Jaeger if endpoint provided
  if (config.jaegerEndpoint) {
    exporters.push('jaeger');
    telemetryConfig.jaeger = {
      endpoint: config.jaegerEndpoint,
      serviceName: config.serviceName,
    };
  }

  // Configure OTLP if endpoint provided
  if (config.otlpEndpoint) {
    exporters.push('otlp');
    telemetryConfig.otlp = {
      endpoint: config.otlpEndpoint,
    };
  }

  // Default to OTLP if no exporters configured
  if (exporters.length === 0) {
    exporters.push('otlp');
    telemetryConfig.otlp = {
      endpoint: 'http://localhost:4318/v1/traces',
    };
  }

  return createOpenTelemetryAdapter({
    config: telemetryConfig,
  });
} 