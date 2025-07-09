// Main factory functions
export {
  createOpenTelemetryAdapter,
  createSimpleOpenTelemetryAdapter,
  createProductionOpenTelemetryAdapter,
} from './factory';

// Core implementation classes
export { OpenTelemetryAdapterImpl } from './opentelemetry.adapter';
export { OpenTelemetrySpanWrapper } from './span';
export { OpenTelemetryTimer, NoOpTimer } from './timer';

// Types and interfaces
export type {
  OpenTelemetryConfig,
  OpenTelemetryAdapter,
  OpenTelemetryExporter,
  CreateOpenTelemetryAdapterOptions,
} from './types';

// Re-export core telemetry types for convenience
export type {
  IgniterTelemetryProvider,
  IgniterTelemetrySpan,
  IgniterTimer,
  IgniterSpanOptions,
  IgniterTelemetryConfig,
} from '@igniter-js/core'; 