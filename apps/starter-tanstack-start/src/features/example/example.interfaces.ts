/**
 * @description Type definitions for the 'example' feature.
 * It's a good practice to define your Zod schemas and TypeScript types
 * in a separate file to keep your code organized.
 *
 * @see https://github.com/felipebarcelospro/igniter-js
 */

import { z } from 'zod';

// Zod schema for the health check response.
// This provides runtime validation and type inference.
export const HealthCheckResponseSchema = z.object({
  status: z.literal('ok'),
  timestamp: z.string().datetime(),
  framework: z.string(),
});

// TypeScript type inferred from the Zod schema.
// This allows you to use the type in your application.
export type HealthCheckResponse = z.infer<typeof HealthCheckResponseSchema>;
