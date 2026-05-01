import type { IgniterTelemetryEmitInput } from "@igniter-js/telemetry";
import { IgniterCoreTelemetryEvents } from "../telemetry";
import type { IgniterCoreTelemetryManager } from "../types/telemetry.interface";

type TelemetryEventRecord = {
  name: string;
  input?: IgniterTelemetryEmitInput<string>;
};

type TelemetryValidationResult = {
  ok: boolean;
  error?: unknown;
};

const telemetryNamespace = IgniterCoreTelemetryEvents.namespace;

const resolveSchema = (name: string) => {
  if (!name.startsWith(`${telemetryNamespace}.`)) return null;
  const shortKey = name.slice(telemetryNamespace.length + 1);
  try {
    return IgniterCoreTelemetryEvents.get.schema(shortKey as never);
  } catch {
    return null;
  }
};

const formatTelemetryError = (error: unknown): string => {
  if (!error) return "Unknown telemetry schema error";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (Array.isArray(error)) {
    return error
      .map((issue) =>
        typeof issue === "object" && issue && "message" in issue
          ? String((issue as { message?: string }).message)
          : String(issue),
      )
      .join("; ");
  }
  if (typeof error === "object") {
    if ("issues" in error && Array.isArray((error as any).issues)) {
      return (error as any).issues
        .map((issue: { message?: string }) => issue.message ?? "Unknown issue")
        .join("; ");
    }
    if ("message" in error) {
      return String((error as { message?: string }).message);
    }
  }
  return "Unknown telemetry schema error";
};

const validateSchema = async (
  schema: unknown,
  attributes: unknown,
): Promise<TelemetryValidationResult> => {
  if (!schema) {
    return { ok: false, error: "Schema not found" };
  }

  if (
    typeof schema === "object" &&
    schema !== null &&
    "safeParse" in schema &&
    typeof (schema as { safeParse?: unknown }).safeParse === "function"
  ) {
    const result = (schema as { safeParse: (value: unknown) => any }).safeParse(
      attributes,
    );
    return result.success ? { ok: true } : { ok: false, error: result.error };
  }

  if (
    typeof schema === "object" &&
    schema !== null &&
    "parse" in schema &&
    typeof (schema as { parse?: unknown }).parse === "function"
  ) {
    try {
      (schema as { parse: (value: unknown) => unknown }).parse(attributes);
      return { ok: true };
    } catch (error) {
      return { ok: false, error };
    }
  }

  if (
    typeof schema === "object" &&
    schema !== null &&
    "~standard" in schema
  ) {
    const standard = (schema as { "~standard"?: { validate?: any } })[
      "~standard"
    ];
    if (standard?.validate) {
      const result = await standard.validate(attributes);
      if (result && "issues" in result && result.issues) {
        return { ok: false, error: result.issues };
      }
      return { ok: true };
    }
  }

  return { ok: false, error: "Unsupported schema validator" };
};

export const createTelemetrySpy = () => {
  const events: TelemetryEventRecord[] = [];

  const telemetry = {
    emit: (name: string, input?: IgniterTelemetryEmitInput<string>) => {
      events.push({ name, input });
    },
    session: () => ({
      run: async (fn: () => Promise<unknown>) => fn(),
    }),
    flush: async () => undefined,
    shutdown: async () => undefined,
    service: "test",
    environment: "test",
  } as IgniterCoreTelemetryManager;

  const getEvent = (name: string) =>
    events.find((event) => event.name === name);

  const getEvents = (name: string) =>
    events.filter((event) => event.name === name);

  return { telemetry, events, getEvent, getEvents };
};

export const validateTelemetryEvent = async (
  event: TelemetryEventRecord,
): Promise<TelemetryValidationResult> => {
  const schema = resolveSchema(event.name);
  if (!schema) {
    return { ok: false, error: `Schema not found for ${event.name}` };
  }
  const attributes = event.input?.attributes ?? {};
  return validateSchema(schema, attributes);
};

export const validateTelemetryEvents = async (
  events: TelemetryEventRecord[],
): Promise<string[]> => {
  const failures: string[] = [];

  for (const event of events) {
    const result = await validateTelemetryEvent(event);
    if (!result.ok) {
      failures.push(`${event.name}: ${formatTelemetryError(result.error)}`);
    }
  }

  return failures;
};
