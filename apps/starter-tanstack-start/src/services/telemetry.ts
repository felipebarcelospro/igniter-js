import { createConsoleTelemetryAdapter } from '@igniter-js/core/adapters'
import { store } from './store'

/**
 * Telemetry service for tracking requests and errors.
 *
 * @remarks
 * Provides telemetry tracking with configurable options.
 *
 * @see https://github.com/felipebarcelospro/igniter-js/tree/main/packages/core
 */
export const telemetry = createConsoleTelemetryAdapter({
  serviceName: 'sample-next-app',
  enableEvents: process.env.IGNITER_TELEMETRY_ENABLE_EVENTS === 'true',
  enableMetrics: process.env.IGNITER_TELEMETRY_ENABLE_METRICS === 'true',
  enableTracing: process.env.IGNITER_TELEMETRY_ENABLE_TRACING === 'true',
}, {
  enableCliIntegration: process.env.IGNITER_TELEMETRY_ENABLE_CLI_INTEGRATION === 'true',
  store: store
})
