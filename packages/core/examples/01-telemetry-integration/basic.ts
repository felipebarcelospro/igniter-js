// Validates: withTelemetry accepts IgniterTelemetry manager instance.
import { IgniterTelemetry } from '@igniter-js/telemetry';
import { Igniter } from '../../dist';

const telemetry = IgniterTelemetry.create()
  .withService('test-service')
  .build();

const igniter = Igniter.create()
  .withTelemetry(telemetry)
  .build();

void igniter;
