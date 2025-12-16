/**
 * @fileoverview Validation utilities for @igniter-js/jobs
 * @module @igniter-js/jobs/utils/validation.utils
 */

import { IgniterJobsError } from "../errors";
import type { IgniterJobsSchema } from "../types/schema";

/**
 * Static utility class for runtime input validation.
 */
export class IgniterJobsValidationUtils {
  /**
   * Checks if a value conforms to the Standard Schema V1 interface.
   *
   * @param value - The value to check.
   * @returns True if the value is a Standard Schema.
   */
  public static isStandardSchema(
    value: unknown,
  ): value is { "~standard": { validate: (value: unknown) => any } } {
    return Boolean(
      value && typeof value === "object" && "~standard" in (value as any),
    );
  }

  /**
   * Checks if a value conforms to a Zod-like schema interface.
   *
   * @param value - The value to check.
   * @returns True if the value is a Zod-like schema.
   */
  public static isZodLikeSchema(value: unknown): value is {
    safeParse?: (value: unknown) => any;
    parse: (value: unknown) => any;
  } {
    return Boolean(
      value && typeof value === "object" && "parse" in (value as any),
    );
  }

  /**
   * Validates input against a provided schema (Standard Schema or Zod-like).
   *
   * @param schema - The schema definition.
   * @param input - The input data to validate.
   * @returns The validated (and possibly transformed) data.
   * @throws {IgniterJobsError} If validation fails.
   */
  public static async validateInput(
    schema: IgniterJobsSchema,
    input: unknown,
  ): Promise<unknown> {
    if (this.isStandardSchema(schema)) {
      const result = await (schema as any)["~standard"].validate(input);
      if ("issues" in result && result.issues) {
        const message = result.issues.map((i: any) => i.message).join("; ");
        throw new IgniterJobsError({
          code: "JOBS_VALIDATION_FAILED",
          message: `Input validation failed: ${message}`,
          details: { issues: result.issues },
          statusCode: 400,
        });
      }
      return (result as any).value;
    }

    if (this.isZodLikeSchema(schema)) {
      if (typeof (schema as any).safeParse === "function") {
        const result = (schema as any).safeParse(input);
        if (!result.success) {
          throw new IgniterJobsError({
            code: "JOBS_VALIDATION_FAILED",
            message: "Input validation failed.",
            details: { error: result.error },
            statusCode: 400,
          });
        }
        return result.data;
      }
      try {
        return (schema as any).parse(input);
      } catch (error) {
        throw new IgniterJobsError({
          code: "JOBS_VALIDATION_FAILED",
          message: "Input validation failed.",
          details: { error },
          statusCode: 400,
        });
      }
    }

    return input;
  }
}
