import type { IgniterResponseProcessor } from "../processors/response.processor";
import type { HTTPMethod, IgniterCookies, IgniterHeaders } from "./action.interface";
import type { UnionToIntersection } from "./utils.interface";

/**
 * Represents the context for an Igniter procedure.
 * @template TActionContext - The type of the custom action context.
 * 
 * @typedef {Object} IgniterProcedureContext
 * @property {Object} request - The HTTP request information.
 * @property {string} request.path - The request path.
 * @property {any} request.params - The route parameters.
 * @property {any} request.body - The request body data.
 * @property {any} request.query - The URL query parameters.
 * @property {HTTPMethod} request.method - The HTTP method used.
 * @property {IgniterHeaders} request.headers - The request headers.
 * @property {IgniterCookies} request.cookies - The request cookies.
 * @property {TActionContext} context - Custom context passed to the procedure.
 * @property {IgniterResponseProcessor} response - The response processor for handling the procedure output.
 * 
 * @since 1.0.0
 */
export type IgniterProcedureContext<TActionContext> = {
  request: {
    path: string;
    params: any;
    body: any;
    query: any;
    method: HTTPMethod;
    headers: IgniterHeaders;
    cookies: IgniterCookies;
  }
  context: TActionContext;
  response: IgniterResponseProcessor;
}

/**
 * Represents a procedure in the Igniter framework.
 * @template TActionContext - The type of the action context.
 * @template TOptions - The type of options passed to the procedure handler.
 * @template TOutput - The type of output returned by the procedure handler.
 * 
 * @property name - The name of the procedure.
 * @property handler - The function that handles the procedure execution.
 * Takes options and a procedure context as parameters and returns a promise
 * or direct value of type TOutput.
 */
export type IgniterProcedure<
  TActionContext,
  TOptions,
  TOutput
> = {
  name: string;
  handler: (options: TOptions, ctx: IgniterProcedureContext<TActionContext>) => Promise<TOutput> | TOutput;
}

/**
 * Infers the procedure context type from an array of IgniterProcedure instances.
 * 
 * @typeParam TActionProcedures - An array of IgniterProcedure instances with generic types for input, output, and context
 * @returns A union-to-intersection type of the awaited return types of all procedure handlers
 * 
 * @example
 * ```typescript
 * type Procedures = [
 *   IgniterProcedure<Input1, Output1, Context1>,
 *   IgniterProcedure<Input2, Output2, Context2>
 * ]
 * type Context = InferProcedureContext<Procedures> // Context1 & Context2
 * ```
 */
export type InferProcedureContext<TActionProcedures extends readonly IgniterProcedure<any, any, any>[]> = 
  UnionToIntersection<Awaited<ReturnType<TActionProcedures[number]['handler']>>>;