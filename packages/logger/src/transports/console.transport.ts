import type { ConsoleTransportOptions } from "../types/transport";

/**
 * Resolves console transport configuration using pino-pretty.
 *
 * @param options - Console transport configuration options
 * @returns Transport descriptor for Pino
 */
export function resolveConsoleTransport(options: ConsoleTransportOptions) {
  return {
    target: "pino-pretty",
    options: {
      colorize: options.colorize ?? true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
      ...options,
    },
  };
}
