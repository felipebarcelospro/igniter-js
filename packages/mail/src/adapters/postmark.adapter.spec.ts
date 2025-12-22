import { describe, expect, it, vi } from 'vitest'
import { PostmarkMailAdapter } from './postmark.adapter'

describe('PostmarkMailAdapter', () => {
  it('throws when secret is missing', async () => {
    const adapter = PostmarkMailAdapter.create({ from: 'no-reply@test.com' })

    await expect(
      adapter.send({
        to: 'user@test.com',
        subject: 'Hello',
        html: '<p>Hi</p>',
        text: 'Hi',
      }),
    ).rejects.toMatchObject({ code: 'MAIL_ADAPTER_CONFIGURATION_INVALID' })
  })

  it('throws when from is missing', async () => {
    const adapter = PostmarkMailAdapter.create({ secret: 'token' })

    await expect(
      adapter.send({
        to: 'user@test.com',
        subject: 'Hello',
        html: '<p>Hi</p>',
        text: 'Hi',
      }),
    ).rejects.toMatchObject({ code: 'MAIL_ADAPTER_CONFIGURATION_INVALID' })
  })

  it('sends using fetch when configured', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock as any)

    const adapter = PostmarkMailAdapter.create({
      secret: 'token',
      from: 'no-reply@test.com',
    })

    await adapter.send({
      to: 'user@test.com',
      subject: 'Hello',
      html: '<p>Hi</p>',
      text: 'Hi',
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)

    vi.unstubAllGlobals()
  })

  it('throws when fetch fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: vi.fn().mockResolvedValue('bad'),
    })
    vi.stubGlobal('fetch', fetchMock as any)

    const adapter = PostmarkMailAdapter.create({
      secret: 'token',
      from: 'no-reply@test.com',
    })

    await expect(
      adapter.send({
        to: 'user@test.com',
        subject: 'Hello',
        html: '<p>Hi</p>',
        text: 'Hi',
      }),
    ).rejects.toMatchObject({ code: 'MAIL_PROVIDER_SEND_FAILED' })

    vi.unstubAllGlobals()
  })
})
