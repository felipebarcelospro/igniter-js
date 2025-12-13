import { describe, expect, it, vi } from 'vitest'

import { PostmarkMailAdapterBuilder } from './adapters/postmark.adapter'
import { SendGridMailAdapterBuilder } from './adapters/sendgrid.adapter'
import { createTestMailAdapter } from './adapters/test.adapter'
import { WebhookMailAdapterBuilder } from './adapters/webhook.adapter'

describe('Mail adapters', () => {
  it('createTestMailAdapter captures sent messages', async () => {
    const adapter = createTestMailAdapter({ silent: true })

    await adapter.send({
      to: 'a@example.com',
      subject: 'Hello',
      html: '<b>hi</b>',
      text: 'hi',
    })

    expect(adapter.sent).toHaveLength(1)
    expect(adapter.last()?.to).toBe('a@example.com')

    adapter.reset()
    expect(adapter.sent).toHaveLength(0)
  })

  it('PostmarkMailAdapterBuilder sends using fetch', async () => {
    const originalFetch = globalThis.fetch
    const fetchSpy = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => '',
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).fetch = fetchSpy

    const adapter = PostmarkMailAdapterBuilder.create()
      .withSecret('pm-token')
      .withFrom('from@example.com')
      .build()

    await adapter.send({
      to: 'to@example.com',
      subject: 'Sub',
      html: '<p>x</p>',
      text: 'x',
    })

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const calls = fetchSpy.mock.calls as unknown as [string, any][]
    const [url, init] = calls[0]
    expect(url).toBe('https://api.postmarkapp.com/email')
    expect(init?.method).toBe('POST')
    expect(init?.headers).toMatchObject({
      'X-Postmark-Server-Token': 'pm-token',
      'Content-Type': 'application/json',
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).fetch = originalFetch
  })

  it('SendGridMailAdapterBuilder sends using fetch', async () => {
    const originalFetch = globalThis.fetch
    const fetchSpy = vi.fn(async () => ({
      ok: true,
      status: 202,
      text: async () => '',
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).fetch = fetchSpy

    const adapter = SendGridMailAdapterBuilder.create()
      .withSecret('sg-key')
      .withFrom('from@example.com')
      .build()

    await adapter.send({
      to: 'to@example.com',
      subject: 'Sub',
      html: '<p>x</p>',
      text: 'x',
    })

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const calls = fetchSpy.mock.calls as unknown as [string, any][]
    const [url, init] = calls[0]
    expect(url).toBe('https://api.sendgrid.com/v3/mail/send')
    expect(init?.method).toBe('POST')
    expect(init?.headers).toMatchObject({
      Authorization: 'Bearer sg-key',
      'Content-Type': 'application/json',
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).fetch = originalFetch
  })

  it('WebhookMailAdapterBuilder posts payload to the configured url', async () => {
    const originalFetch = globalThis.fetch
    const fetchSpy = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => '',
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).fetch = fetchSpy

    const adapter = WebhookMailAdapterBuilder.create()
      .withUrl('https://example.com/webhook')
      .withFrom('from@example.com')
      .build()

    await adapter.send({
      to: 'to@example.com',
      subject: 'Sub',
      html: '<p>x</p>',
      text: 'x',
    })

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const calls = fetchSpy.mock.calls as unknown as [string, any][]
    const [url, init] = calls[0]
    expect(url).toBe('https://example.com/webhook')
    expect(init?.method).toBe('POST')
    expect(init?.headers).toMatchObject({
      'Content-Type': 'application/json',
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).fetch = originalFetch
  })
})
