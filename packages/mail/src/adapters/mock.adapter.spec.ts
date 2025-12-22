import { describe, expect, it } from 'vitest'
import { MockMailAdapter } from './mock.adapter'

describe('MockMailAdapter', () => {
  it('tracks send calls and payloads', async () => {
    const adapter = MockMailAdapter.create()

    await adapter.send({
      to: 'user@example.com',
      subject: 'Hello',
      html: '<p>Hello</p>',
      text: 'Hello',
    })

    expect(adapter.calls.send).toBe(1)
    expect(adapter.sent).toHaveLength(1)
    expect(adapter.sent[0]?.to).toBe('user@example.com')
  })

  it('clears tracked state', async () => {
    const adapter = MockMailAdapter.create()

    await adapter.send({
      to: 'user@example.com',
      subject: 'Hello',
      html: '<p>Hello</p>',
      text: 'Hello',
    })

    adapter.clear()

    expect(adapter.calls.send).toBe(0)
    expect(adapter.sent).toHaveLength(0)
  })
})
