import { OpenTelemetryAdapterImpl } from './opentelemetry.adapter';
import type {
  OpenTelemetryAdapter,
  CreateOpenTelemetryAdapterOptions,
} from './types';
import { isServer } from '@igniter-js/core';

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
export function createOpenTelemetryAdapter(
  options: CreateOpenTelemetryAdapterOptions
): OpenTelemetryAdapter {
  const {
    config,
  } = options;

  // Validate required configuration
  if (!config.serviceName) {
    throw new Error('[OpenTelemetry] serviceName is required in config');
  }

  if (!isServer) {
    return {} as OpenTelemetryAdapter;
  }

  // Create adapter instance
  const adapter = new OpenTelemetryAdapterImpl(config);

  // Return the adapter
  return adapter;
}