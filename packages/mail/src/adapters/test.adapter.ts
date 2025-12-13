import type { IgniterLogger } from '@igniter-js/core'

import type { MailAdapter, MailAdapterSendParams } from '../types/adapter'

/**
 * In-memory message captured by {@link TestMailAdapter}.
 */
export type TestMailMessage = MailAdapterSendParams & {
  /** Timestamp when `send()` was called. */
  at: Date
}

/**
 * A test-focused adapter that captures emails in memory.
 *
 * Why this exists:
 * - Allows unit tests to assert subjects/recipients/content without hitting a real provider.
 * - Can optionally log the send operation for local debugging.
 *
 * This adapter is intentionally dependency-free so it can live in `@igniter-js/mail/adapters`.
 */
export type TestMailAdapter = MailAdapter & {
  /** Captured sent messages, in order. */
  readonly sent: TestMailMessage[]
  /** Clears captured messages. */
  reset: () => void
  /** Returns the last captured message (if any). */
  last: () => TestMailMessage | undefined
}

export type CreateTestMailAdapterOptions = {
  /** Optional logger; defaults to `console`. */
  logger?: Pick<IgniterLogger, 'info'>
  /** Whether to suppress logs. Default: `false`. */
  silent?: boolean
}

/**
 * Creates a {@link TestMailAdapter}.
 */
export function createTestMailAdapter(
  options: CreateTestMailAdapterOptions = {},
): TestMailAdapter {
  const sent: TestMailMessage[] = []
  const logger = options.logger ?? console
  const silent = options.silent ?? false

  return {
    sent,
    reset: () => {
      sent.length = 0
    },
    last: () => sent.at(-1),
    send: async (params) => {
      sent.push({ ...params, at: new Date() })

      if (!silent) {
        logger.info(
          `[TestMailAdapter] to=${params.to} subject=${params.subject} html=${params.html.length}B text=${params.text.length}B`,
        )
      }
    },
  }
}
