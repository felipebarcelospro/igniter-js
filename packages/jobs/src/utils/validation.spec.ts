/**
 * @fileoverview Tests for IgniterJobsValidationUtils
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";
import { IgniterJobsValidationUtils } from "./validation";
import { IgniterJobsError } from "../errors";

describe("IgniterJobsValidationUtils", () => {
  describe("isStandardSchema()", () => {
    it("returns true for Standard Schema V1 compliant objects", () => {
      const standardSchema = {
        "~standard": {
          validate: (value: unknown) => ({ value }),
        },
      };

      expect(IgniterJobsValidationUtils.isStandardSchema(standardSchema)).toBe(
        true
      );
    });

    it("returns false for null", () => {
      expect(IgniterJobsValidationUtils.isStandardSchema(null)).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(IgniterJobsValidationUtils.isStandardSchema(undefined)).toBe(
        false
      );
    });

    it("returns false for primitives", () => {
      expect(IgniterJobsValidationUtils.isStandardSchema("string")).toBe(false);
      expect(IgniterJobsValidationUtils.isStandardSchema(123)).toBe(false);
      expect(IgniterJobsValidationUtils.isStandardSchema(true)).toBe(false);
    });

    it("returns false for plain objects without ~standard", () => {
      expect(IgniterJobsValidationUtils.isStandardSchema({})).toBe(false);
      expect(
        IgniterJobsValidationUtils.isStandardSchema({ validate: () => {} })
      ).toBe(false);
    });

    it("returns false for arrays", () => {
      expect(IgniterJobsValidationUtils.isStandardSchema([])).toBe(false);
    });
  });

  describe("isZodLikeSchema()", () => {
    it("returns true for Zod schemas", () => {
      const zodSchema = z.object({ email: z.string() });

      expect(IgniterJobsValidationUtils.isZodLikeSchema(zodSchema)).toBe(true);
    });

    it("returns true for objects with parse method", () => {
      const schemaLike = {
        parse: (value: unknown) => value,
      };

      expect(IgniterJobsValidationUtils.isZodLikeSchema(schemaLike)).toBe(true);
    });

    it("returns true for objects with safeParse and parse methods", () => {
      const schemaLike = {
        parse: (value: unknown) => value,
        safeParse: (value: unknown) => ({ success: true, data: value }),
      };

      expect(IgniterJobsValidationUtils.isZodLikeSchema(schemaLike)).toBe(true);
    });

    it("returns false for null", () => {
      expect(IgniterJobsValidationUtils.isZodLikeSchema(null)).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(IgniterJobsValidationUtils.isZodLikeSchema(undefined)).toBe(false);
    });

    it("returns false for primitives", () => {
      expect(IgniterJobsValidationUtils.isZodLikeSchema("string")).toBe(false);
      expect(IgniterJobsValidationUtils.isZodLikeSchema(123)).toBe(false);
      expect(IgniterJobsValidationUtils.isZodLikeSchema(true)).toBe(false);
    });

    it("returns false for plain objects without parse", () => {
      expect(IgniterJobsValidationUtils.isZodLikeSchema({})).toBe(false);
      expect(
        IgniterJobsValidationUtils.isZodLikeSchema({ validate: () => {} })
      ).toBe(false);
    });
  });

  describe("validateInput()", () => {
    describe("with Zod schema", () => {
      it("validates and returns data for valid input", async () => {
        const schema = z.object({
          email: z.string().email(),
          name: z.string(),
        });

        const input = { email: "test@example.com", name: "John" };
        const result = await IgniterJobsValidationUtils.validateInput(
          schema,
          input
        );

        expect(result).toEqual(input);
      });

      it("throws IgniterJobsError for invalid input", async () => {
        const schema = z.object({
          email: z.string().email(),
        });

        const input = { email: "not-an-email" };

        await expect(
          IgniterJobsValidationUtils.validateInput(schema, input)
        ).rejects.toThrow(IgniterJobsError);
      });

      it("throws with JOBS_VALIDATION_FAILED code", async () => {
        const schema = z.object({
          email: z.string().email(),
        });

        const input = { email: "invalid" };

        try {
          await IgniterJobsValidationUtils.validateInput(schema, input);
          expect.fail("Should have thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(IgniterJobsError);
          expect((error as IgniterJobsError).code).toBe(
            "JOBS_VALIDATION_FAILED"
          );
        }
      });

      it("throws with 400 status code", async () => {
        const schema = z.object({
          email: z.string().email(),
        });

        const input = { email: "invalid" };

        try {
          await IgniterJobsValidationUtils.validateInput(schema, input);
          expect.fail("Should have thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(IgniterJobsError);
          expect((error as IgniterJobsError).statusCode).toBe(400);
        }
      });

      it("transforms data according to schema", async () => {
        const schema = z.object({
          count: z.string().transform((v) => parseInt(v, 10)),
        });

        const input = { count: "42" };
        const result = await IgniterJobsValidationUtils.validateInput(
          schema,
          input
        );

        expect(result).toEqual({ count: 42 });
      });

      it("applies default values", async () => {
        const schema = z.object({
          name: z.string(),
          enabled: z.boolean().default(true),
        });

        const input = { name: "Test" };
        const result = await IgniterJobsValidationUtils.validateInput(
          schema,
          input
        );

        expect(result).toEqual({ name: "Test", enabled: true });
      });
    });

    describe("with Standard Schema V1", () => {
      it("validates and returns data for valid input", async () => {
        const schema = {
          "~standard": {
            validate: (value: unknown) => ({ value }),
          },
        };

        const input = { name: "John" };
        const result = await IgniterJobsValidationUtils.validateInput(
          schema as any,
          input
        );

        expect(result).toEqual(input);
      });

      it("throws IgniterJobsError when validation has issues", async () => {
        const schema = {
          "~standard": {
            validate: () => ({
              issues: [{ message: "Invalid value" }],
            }),
          },
        };

        await expect(
          IgniterJobsValidationUtils.validateInput(schema as any, {})
        ).rejects.toThrow(IgniterJobsError);
      });

      it("includes issue messages in error", async () => {
        const schema = {
          "~standard": {
            validate: () => ({
              issues: [
                { message: "First error" },
                { message: "Second error" },
              ],
            }),
          },
        };

        try {
          await IgniterJobsValidationUtils.validateInput(schema as any, {});
          expect.fail("Should have thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(IgniterJobsError);
          expect((error as IgniterJobsError).message).toContain("First error");
          expect((error as IgniterJobsError).message).toContain("Second error");
        }
      });
    });

    describe("with Zod-like schema (parse only)", () => {
      it("validates using parse method when safeParse is not available", async () => {
        const schema = {
          parse: (value: unknown) => value,
        };

        const input = { name: "John" };
        const result = await IgniterJobsValidationUtils.validateInput(
          schema as any,
          input
        );

        expect(result).toEqual(input);
      });

      it("throws IgniterJobsError when parse throws", async () => {
        const schema = {
          parse: () => {
            throw new Error("Parse failed");
          },
        };

        await expect(
          IgniterJobsValidationUtils.validateInput(schema as any, {})
        ).rejects.toThrow(IgniterJobsError);
      });
    });

    describe("with non-schema input (passthrough)", () => {
      it("returns input as-is when schema is not recognized", async () => {
        const notASchema = {} as any;
        const input = { name: "John", value: 42 };

        const result = await IgniterJobsValidationUtils.validateInput(
          notASchema,
          input
        );

        expect(result).toBe(input);
      });

      it("returns primitives as-is", async () => {
        const notASchema = {} as any;

        expect(
          await IgniterJobsValidationUtils.validateInput(notASchema, "string")
        ).toBe("string");
        expect(
          await IgniterJobsValidationUtils.validateInput(notASchema, 123)
        ).toBe(123);
        expect(
          await IgniterJobsValidationUtils.validateInput(notASchema, true)
        ).toBe(true);
      });

      it("returns null and undefined as-is", async () => {
        const notASchema = {} as any;

        expect(
          await IgniterJobsValidationUtils.validateInput(notASchema, null)
        ).toBe(null);
        expect(
          await IgniterJobsValidationUtils.validateInput(notASchema, undefined)
        ).toBe(undefined);
      });
    });

    describe("complex validation scenarios", () => {
      it("validates nested objects", async () => {
        const schema = z.object({
          user: z.object({
            name: z.string(),
            email: z.string().email(),
          }),
          metadata: z.object({
            tags: z.array(z.string()),
          }),
        });

        const input = {
          user: { name: "John", email: "john@example.com" },
          metadata: { tags: ["a", "b"] },
        };

        const result = await IgniterJobsValidationUtils.validateInput(
          schema,
          input
        );

        expect(result).toEqual(input);
      });

      it("validates arrays", async () => {
        const schema = z.array(z.string().min(1));

        const input = ["hello", "world"];
        const result = await IgniterJobsValidationUtils.validateInput(
          schema,
          input
        );

        expect(result).toEqual(input);
      });

      it("validates unions", async () => {
        const schema = z.union([
          z.object({ type: z.literal("email"), email: z.string() }),
          z.object({ type: z.literal("sms"), phone: z.string() }),
        ]);

        const emailInput = { type: "email" as const, email: "test@test.com" };
        const smsInput = { type: "sms" as const, phone: "+1234567890" };

        const emailResult = await IgniterJobsValidationUtils.validateInput(
          schema,
          emailInput
        );
        const smsResult = await IgniterJobsValidationUtils.validateInput(
          schema,
          smsInput
        );

        expect(emailResult).toEqual(emailInput);
        expect(smsResult).toEqual(smsInput);
      });

      it("validates optional fields", async () => {
        const schema = z.object({
          required: z.string(),
          optional: z.string().optional(),
        });

        const inputWithOptional = { required: "yes", optional: "also yes" };
        const inputWithoutOptional = { required: "yes" };

        const result1 = await IgniterJobsValidationUtils.validateInput(
          schema,
          inputWithOptional
        );
        const result2 = await IgniterJobsValidationUtils.validateInput(
          schema,
          inputWithoutOptional
        );

        expect(result1).toEqual(inputWithOptional);
        expect(result2).toEqual(inputWithoutOptional);
      });
    });
  });
});
