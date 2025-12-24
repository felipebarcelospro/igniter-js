import type { IgniterTelemetryEventSchema, IgniterTelemetryEventsMap } from "../types";
import { IgniterTelemetryValidator } from "../utils/validator";

/**
 * Builder for event groups.
 */
export class IgniterTelemetryEventsGroup<
  TEvents extends IgniterTelemetryEventsMap = {},
> {
  private readonly events: TEvents;

  private constructor(events: TEvents = {} as TEvents) {
    this.events = events;
  }

  static create(): IgniterTelemetryEventsGroup<{}> {
    return new IgniterTelemetryEventsGroup({});
  }

  event<TName extends string, TSchema extends IgniterTelemetryEventSchema>(
    name: TName,
    schema: TSchema,
  ): IgniterTelemetryEventsGroup<TEvents & { [K in TName]: TSchema }> {
    IgniterTelemetryValidator.validate(name, "Event");

    return new IgniterTelemetryEventsGroup({
      ...this.events,
      [name]: schema,
    } as TEvents & { [K in TName]: TSchema });
  }

  group<TName extends string, TGroupEvents extends IgniterTelemetryEventsMap>(
    name: TName,
    builder: (
      group: IgniterTelemetryEventsGroup<{}>,
    ) => IgniterTelemetryEventsGroup<TGroupEvents>,
  ): IgniterTelemetryEventsGroup<TEvents & { [K in TName]: TGroupEvents }> {
    IgniterTelemetryValidator.validate(name, "Group");

    const group = builder(IgniterTelemetryEventsGroup.create());
    const groupEvents = group.build();

    return new IgniterTelemetryEventsGroup({
      ...this.events,
      [name]: groupEvents,
    } as TEvents & { [K in TName]: TGroupEvents });
  }

  build(): TEvents {
    return this.events;
  }
}
