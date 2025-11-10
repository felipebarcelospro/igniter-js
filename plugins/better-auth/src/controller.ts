import type {
  IgniterControllerConfig,
  IgniterControllerBaseAction,
  StandardSchemaV1,
  MutationMethod,
} from "@igniter-js/core";
import {
  createIgniterController,
  createIgniterMutation,
  createIgniterQuery,
} from "@igniter-js/core";

type MethodKey = "get" | "post" | "put" | "patch" | "delete";
type UpperMethod<M extends MethodKey> = M extends "get"
  ? "GET"
  : M extends "post"
    ? "POST"
    : M extends "put"
      ? "PUT"
      : M extends "patch"
        ? "PATCH"
        : "DELETE";

type InputArg<T> = T extends (arg: infer A, ...rest: any[]) => any
  ? A
  : unknown;
type AwaitedReturn<T> = T extends Promise<infer U> ? U : T;

type BuildActionFromFn<Fn, M extends "GET" | MutationMethod> = Fn extends (
  ...args: any[]
) => any
  ? Fn extends (arg: infer A) => infer R
    ? IgniterControllerBaseAction & {
        $Infer: {
          // Infer types for Igniter action callers
          $Input: M extends "GET"
            ? {
                query: A;
                params: any;
                headers?: Record<string, string>;
                cookies?: Record<string, string>;
                credentials?: unknown;
              }
            : {
                body: A;
                params: any;
                headers?: Record<string, string>;
                cookies?: Record<string, string>;
                credentials?: unknown;
              };
          $Output: AwaitedReturn<R> extends { data: infer D }
            ? D
            : AwaitedReturn<R>;
          $Response: { data?: AwaitedReturn<R>; error?: unknown };
        };
      }
    : IgniterControllerBaseAction
  : IgniterControllerBaseAction;

type MapTopLevelFunctions<T> = {
  [K in keyof T & string as T[K] extends (...args: any[]) => any
    ? K
    : never]: BuildActionFromFn<T[K], "POST">;
};

type MapTopLevelMethod<T, M extends MethodKey> = {
  [K in keyof T & string as T[K] extends Record<M, (...args: any[]) => any>
    ? `${K}_${M}`
    : never]: T[K] extends Record<M, (...args: any[]) => any>
    ? BuildActionFromFn<NonNullable<T[K][M]>, UpperMethod<M>>
    : never;
};

export type ApiToControllerActions<TApi> = MapTopLevelFunctions<TApi> &
  MapTopLevelMethod<TApi, "get"> &
  MapTopLevelMethod<TApi, "post"> &
  MapTopLevelMethod<TApi, "put"> &
  MapTopLevelMethod<TApi, "patch"> &
  MapTopLevelMethod<TApi, "delete">;

// Create a virtual schema that only carries types. Runtime validate is a passthrough.
function schemaOf<T>(): StandardSchemaV1<T, T> {
  return {
    ["~standard"]: {
      version: 1,
      vendor: "igniter-virtual",
      validate: (value: unknown) => ({ value: value as T }),
      types: {
        input: undefined as unknown as T,
        output: undefined as unknown as T,
      },
    },
  };
}

type BodyOf<A> = A extends { body: infer B } ? B : undefined
type QueryOf<A> = A extends { query?: infer Q } ? Q : undefined

export function createBetterAuthController<
  TAuth extends { api: Record<string, unknown> },
>(auth: TAuth) {
  type TApi = TAuth["api"];
  type TActions = ApiToControllerActions<TApi>;

  const actions: Record<string, IgniterControllerBaseAction> = {};

  const api = auth.api as Record<string, unknown>;

  for (const [key, value] of Object.entries(api)) {
    // All API properties are functions with an input context argument
    if (typeof value === "function") {
      const fn = value as (input: any) => unknown;

      // Try to read a runtime method metadata on the function; fallback to POST
      const runtimeMethod = (() => {
        const m = (fn as any)?.method || (fn as any)?.defaultMethod || (fn as any)?.httpMethod;
        const up = typeof m === "string" ? m.toUpperCase() : undefined;
        return up === "GET" || up === "POST" || up === "PUT" || up === "PATCH" || up === "DELETE" ? (up as UpperMethod<MethodKey>) : "POST";
      })();

      type A = InputArg<typeof fn>;
      type TBody = BodyOf<A>;
      type TQuery = QueryOf<A>;

      if (runtimeMethod === "GET") {
        actions[key] = createIgniterQuery({
          name: key,
          path: `/${key}` as const,
          query: schemaOf<TQuery>(),
          handler: async ({ request, response }) => {
            const input: A = {
              method: "GET",
              query: request.query as any,
              params: request.params as any,
              headers: request.headers as any,
              request: (request as any).raw,
            };
            const result = await fn(input);
            return response.json(result as any);
          },
        }) as unknown as IgniterControllerBaseAction;
      } else {
        actions[key] = createIgniterMutation({
          name: key,
          path: `/${key}` as const,
          method: runtimeMethod as MutationMethod,
          body: schemaOf<TBody>(),
          query: schemaOf<TQuery>(),
          handler: async ({ request, response }) => {
            const input: A = {
              method: runtimeMethod,
              body: request.body as any,
              query: request.query as any,
              params: request.params as any,
              headers: request.headers as any,
              request: (request as any).raw,
            };
            const result = await fn(input);
            return response.json(result as any);
          },
        }) as unknown as IgniterControllerBaseAction;
      }
    }
  }

  // Return typed controller
  return createIgniterController<ApiToControllerActions<TApi>>({
    name: "auth",
    path: "auth",
    actions: actions as unknown as any,
  });
}
