/**
 * @fileoverview Type inference validation test
 *
 * This test validates that schema types are properly propagated from
 * IgniterCallerSchema.build() through withSchemas() to the manager.
 *
 * Issue: When using apiSchemas.build().withSchemas(), the type inference
 * was being lost due to overly broad type casting.
 *
 * Fix: Remove the type assertion that was widening the types, and properly
 * exclude the mock property when schemas change.
 */

import { expectTypeOf, describe, it } from "vitest";
import { z } from "zod";
import { IgniterCallerSchema } from "../schema.builder";
import { IgniterCaller } from "../main.builder";

describe("Schema Type Inference", () => {
  it("should preserve concrete schema types through .build() -> .withSchemas() chain", () => {
    // Define concrete schemas
    const LoginSchema = z.object({
      email: z.string().email(),
      password: z.string(),
    });

    const SessionSchema = z.object({
      token: z.string(),
      userId: z.string(),
    });

    // Build schemas
    const apiSchemas = IgniterCallerSchema.create()
      .path("/auth/login", (path) =>
        path.post({
          request: LoginSchema,
          responses: {
            200: SessionSchema,
          },
        })
      )
      .build();

    // Create caller with schemas
    const api = IgniterCaller.create()
      .withBaseUrl("http://localhost:3000")
      .withSchemas(apiSchemas)
      .build();

    // Type assertions to validate that concrete types are preserved
    expectTypeOf(api).toHaveProperty("post");

    // The manager should have the concrete schema types, not generic TSchemas
    type ApiType = typeof api;

    // Verify that the schema map has the expected path
    expectTypeOf<ApiType>().toMatchTypeOf<{
      post(url: "/auth/login"): any;
    }>();
  });

  it("should provide type-safe request bodies and responses", async () => {
    const apiSchemas = IgniterCallerSchema.create()
      .path("/users", (path) =>
        path.post({
          request: z.object({
            name: z.string(),
            email: z.string().email(),
          }),
          responses: {
            201: z.object({
              id: z.string(),
              name: z.string(),
              email: z.string(),
            }),
          },
        })
      )
      .build();

    const api = IgniterCaller.create()
      .withSchemas(apiSchemas)
      .build();

    // The post method should accept the correct body type
    const requestBuilder = api.post("/users");

    // TypeScript should enforce the body matches the request schema
    expectTypeOf(requestBuilder.body).toBeCallableWith({
      name: "John Doe",
      email: "john@example.com",
    });

    // TypeScript should reject invalid body
    expectTypeOf(requestBuilder.body).parameter(0).not.toMatchTypeOf({
      name: 123, // wrong type
      email: "john@example.com",
    });
  });
});
