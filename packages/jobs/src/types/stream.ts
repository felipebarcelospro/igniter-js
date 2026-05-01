import type { IgniterJobsScopeEntry } from "./scope";
import type {
  IgniterJobsInferSchemaInput,
  IgniterJobsInferSchemaOutput,
  IgniterJobsSchema,
} from "./schema";

export type IgniterJobsJobStreamSchemaMap = Record<string, IgniterJobsSchema>;

export interface IgniterJobsJobStreamPersistenceConfig {
  enabled: boolean;
  maxEvents?: number;
}

export interface IgniterJobsJobStreamDefinition<
  TEvents extends IgniterJobsJobStreamSchemaMap | undefined = undefined,
> {
  persistence?: IgniterJobsJobStreamPersistenceConfig;
  events?: TEvents;
}

export interface IgniterJobsJobStreamEvent<
  TType extends string = string,
  TData = unknown,
> {
  id: string;
  type: TType;
  data: TData;
  timestamp: Date;
  jobId: string;
  jobName: string;
  queue: string;
  scope?: IgniterJobsScopeEntry;
}

export interface IgniterJobsJobStreamReadParams {
  after?: string;
  limit?: number;
}

export type IgniterJobsJobStreamReadResult<
  TEvent extends IgniterJobsJobStreamEvent = IgniterJobsJobStreamEvent,
> = {
  items: TEvent[];
  nextCursor?: string;
  hasMore: boolean;
};

export type IgniterJobsStreamEventsFromDefinition<TDef> = TDef extends {
  stream?: { events?: infer TEvents };
}
  ? TEvents extends IgniterJobsJobStreamSchemaMap
    ? TEvents
    : {}
  : {};

type IgniterJobsStreamEventKeys<TDef> = Extract<
  keyof IgniterJobsStreamEventsFromDefinition<TDef>,
  string
>;

export type IgniterJobsInferStreamType<TDef> = [
  IgniterJobsStreamEventKeys<TDef>,
] extends [never]
  ? string
  : IgniterJobsStreamEventKeys<TDef>;

export type IgniterJobsInferStreamEmitData<TDef, TType extends string> = [
  IgniterJobsStreamEventKeys<TDef>,
] extends [never]
  ? unknown
  : TType extends IgniterJobsStreamEventKeys<TDef>
    ? IgniterJobsInferSchemaInput<
        IgniterJobsStreamEventsFromDefinition<TDef>[TType]
      >
    : unknown;

export type IgniterJobsInferStreamReadData<TDef, TType extends string> = [
  IgniterJobsStreamEventKeys<TDef>,
] extends [never]
  ? unknown
  : TType extends IgniterJobsStreamEventKeys<TDef>
    ? IgniterJobsInferSchemaOutput<
        IgniterJobsStreamEventsFromDefinition<TDef>[TType]
      >
    : unknown;

export type IgniterJobsInferJobStreamEvent<TDef> = [
  IgniterJobsStreamEventKeys<TDef>,
] extends [never]
  ? IgniterJobsJobStreamEvent<string, unknown>
  : {
      [K in IgniterJobsStreamEventKeys<TDef>]: IgniterJobsJobStreamEvent<
        K,
        IgniterJobsInferStreamReadData<TDef, K>
      >;
    }[IgniterJobsStreamEventKeys<TDef>];

export interface IgniterJobsExecutionStreamEmitter<
  TDef = unknown,
  TType extends string = IgniterJobsInferStreamType<TDef>,
> {
  emit<TEventType extends TType>(
    type: TEventType,
    data: IgniterJobsInferStreamEmitData<TDef, TEventType>,
  ): Promise<string>;
}

export interface IgniterJobsJobStreamAccessor<TDef = unknown> {
  subscribe(
    handler: (
      event: IgniterJobsInferJobStreamEvent<TDef>,
    ) => void | Promise<void>,
  ): Promise<() => Promise<void>>;
  read(
    params?: IgniterJobsJobStreamReadParams,
  ): Promise<
    IgniterJobsJobStreamReadResult<IgniterJobsInferJobStreamEvent<TDef>>
  >;
}
