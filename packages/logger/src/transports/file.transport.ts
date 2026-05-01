import type { FileTransportOptions } from "../types/transport";

/**
 * Resolves file transport configuration using the built-in Pino file target.
 *
 * @param options - File transport configuration options
 * @returns Transport descriptor for Pino
 */
export function resolveFileTransport(options: FileTransportOptions) {
  return {
    target: "pino/file",
    options: {
      destination: options.path,
      mkdir: options.mkdir ?? true,
      ...options,
    },
  };
}
