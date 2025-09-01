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
    | {
        data: TData;
        error: null;
      }
    | {
        data: null;
        error: TError;
      };

  /**
   * Represents an error response within the Igniter system.
   * This class encapsulates error details including a code, an optional message, and optional data.
   * It is designed to be thrown or returned to indicate a specific problem.
   *
   * @template TCode The specific error code type, defaulting to "ERR_UNKNOWN_ERROR".
   * @template TData The type of additional data associated with the error, defaulting to `unknown`.
   */
  export class IgniterResponseError<
    TCode extends IgniterCommonErrorCode = "ERR_UNKNOWN_ERROR",
    TData = unknown,
  > {
    public code: TCode;
    public message?: string;
    public data?: TData;

    /**
     * Creates an instance of IgniterResponseError.
     *
     * @param error An object containing the error details.
     * @param error.code The unique error code.
     * @param error.message An optional human-readable message describing the error.
     * @param error.data Optional additional data related to the error.
     */
    constructor(public error: {
      code: TCode;
      message?: string;
      data?: TData;
    }) {
      this.code = error.code;
      this.message = error.message;
      this.data = error.data;
    }

    /**
     * Returns a plain object representation of the error, useful for serialization.
     *
     * @returns An object containing the error code, message, and data.
     */
    toJSON() {
      return this.error;
    }

    /**
     * Returns the error code.
     * @returns The error code.
     */
    getCode(): TCode {
      return this.error.code;
    }

    /**
     * Returns the optional error message.
     * @returns The error message, or `undefined` if not set.
     */
    getMessage(): string | undefined {
      return this.error.message;
    }

    /**
     * Returns the optional error data.
     * @returns The error data, or `undefined` if not set.
     */
    getData(): TData | undefined {
      return this.error.data;
    }

    /**
     * Returns a string representation of the error.
     * @returns A string combining the error code and message.
     */
    toString(): string {
      const messagePart = this.error.message ? `: ${this.error.message}` : '';
      return `IgniterResponseError [${this.error.code}]${messagePart}`;
    }
}
