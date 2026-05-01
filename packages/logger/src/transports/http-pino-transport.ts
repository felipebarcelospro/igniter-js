/**
 * @fileoverview Pino transport worker for HTTP logging
 * @module @igniter-js/logger/transports/http-pino-transport
 * 
 * This file is loaded as a Pino transport worker.
 * It receives log entries via stdin and sends them to a remote HTTP endpoint.
 */

import build from 'pino-abstract-transport';
import { HttpLogSender } from './http-sender';
import type { HttpTransportOptions } from '../types/transport';

/**
 * Pino transport for HTTP logging.
 * Buffers logs and sends in batches to avoid blocking.
 */
export default async function (opts: HttpTransportOptions) {
  const sender = new HttpLogSender(opts);

  return build(async function (source) {
    for await (const obj of source) {
      // Send log entry asynchronously (non-blocking)
      sender.send(obj);
    }
  }, {
    async close() {
      // Flush remaining logs on close
      await sender.flush();
      sender.destroy();
    },
  });
}
