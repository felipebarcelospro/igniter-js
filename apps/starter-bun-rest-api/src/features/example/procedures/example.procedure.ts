import { igniter } from "@/igniter";
import type { ExampleHelloResponse } from "../example.interfaces";

/**
 * @description Example procedure demonstrating Igniter.js features
 * @see https://igniterjs.com/docs/core/procedures
 */
export const ExampleProcedure = igniter.procedure({
  name: 'example',
  handler(options, { request, response, context }) {
    return {
      example: {
        hello: (): ExampleHelloResponse => {
          return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            features: {
              store: !!igniter.store,
              jobs: !!igniter.jobs,
              logging: !!igniter.logger,
              telemetry: !!igniter.telemetry,
            }
          }
        }
      }
    }
  },
})