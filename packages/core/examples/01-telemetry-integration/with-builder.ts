// Validates: telemetry type flows through builder instances.
import { IgniterTelemetry } from '@igniter-js/telemetry';
import { Igniter } from '@igniter-js/core';

const telemetry = IgniterTelemetry.create()
  .withService('test-service')
  .build();

const builder = Igniter.create().withTelemetry(telemetry);
const igniter = builder.build();

void igniter;
