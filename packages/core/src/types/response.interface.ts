import type { Prettify } from "./utils.interface";

export type IgniterProcessorResponse<TSuccess = unknown, TError = unknown> = {
  data: TSuccess;
  error: TError | null;
};

export type IgniterErrorResponse<TCode extends string, TData = unknown> = {
  code: TCode;
  message?: string;
  data?: TData;
};

export type IgniterCommonErrorCode =
  | "ERR_UNKNOWN_ERROR"
  | "ERR_BAD_REQUEST"
  | "ERR_UNAUTHORIZED"
  | "ERR_FORBIDDEN"
  | "ERR_NOT_FOUND"
  | "ERR_REDIRECT";

export type IgniterResponseSuccess<TData = unknown> = {
  data: TData;
};

export type IgniterResponseBadRequest<TBadRequestData = unknown> =
  IgniterResponseError<"ERR_BAD_REQUEST", TBadRequestData>;

export type IgniterResponseRedirect = IgniterResponseError<
  "ERR_REDIRECT",
  {
    destination: string;
    type: "replace" | "push";
  }
>;

export type IgniterResponseNotFound<TNotFoundData = unknown> =
  IgniterResponseError<"ERR_NOT_FOUND", TNotFoundData>;

export type IgniterResponseUnauthorized<TUnauthorizedData = unknown> =
  IgniterResponseError<"ERR_UNAUTHORIZED", TUnauthorizedData>;

export type IgniterResponseForbidden<TForbiddenData = unknown> =
  IgniterResponseError<"ERR_FORBIDDEN", TForbiddenData>;

export type IgniterResponse<TData = unknown, TError = unknown> =
  | { type: "success"; data: TData; error: null }
  | { type: "error"; data: null; error: TError extends IgniterResponseError<infer TErrorCode, infer TErrorData> ? {
    code: TErrorCode;
    message?: string;
    data?: TErrorData;
  } : never};

export class IgniterResponseError<
  TCode extends IgniterCommonErrorCode = "ERR_UNKNOWN_ERROR",
  TData = unknown,
> {
  constructor(public error: {
    code: TCode;
    message?: string;
    data?: TData;
  }) {}

  toJSON() {
    return this.error;
  }
}