import type {
  IgniterMailAdapter,
  IgniterMailAdapterSendParams,
} from '../types/adapter'

/**
 * In-memory mock adapter for `@igniter-js/mail`.
 *
 * Use this in tests to avoid real provider calls.
 */
export class MockMailAdapter implements IgniterMailAdapter {
  /** Creates a new mock adapter instance. */
  static create(): MockMailAdapter {
    return new MockMailAdapter()
  }

  /** Tracks all send calls. */
  public readonly sent: IgniterMailAdapterSendParams[] = []

  /** Tracks method call counts. */
  public readonly calls = {
    send: 0,
  }

  async send(params: IgniterMailAdapterSendParams): Promise<void> {
    this.calls.send += 1
    this.sent.push(params)
  }

  /** Clears all tracked state. */
  clear(): void {
    this.sent.length = 0
    this.calls.send = 0
  }
}
