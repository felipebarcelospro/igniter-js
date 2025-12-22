import { describe, expect, it, vi } from 'vitest'
import { ResendMailAdapter } from './resend.adapter'

const createMock = vi.fn().mockResolvedValue({})

vi.mock('resend', () => ({
  Resend: class {
    emails = { create: createMock }
  },
}))

describe('ResendMailAdapter', () => {
  it('throws when secret is missing', async () => {
    const adapter = ResendMailAdapter.create({ from: 'no-reply@test.com' })

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
    const adapter = ResendMailAdapter.create({ secret: 'token' })

    await expect(
      adapter.send({
        to: 'user@test.com',
        subject: 'Hello',
        html: '<p>Hi</p>',
        text: 'Hi',
      }),
    ).rejects.toMatchObject({ code: 'MAIL_ADAPTER_CONFIGURATION_INVALID' })
  })

  it('calls Resend SDK when configured', async () => {
    const adapter = ResendMailAdapter.create({
      secret: 'token',
      from: 'no-reply@test.com',
    })

    await adapter.send({
      to: 'user@test.com',
      subject: 'Hello',
      html: '<p>Hi</p>',
      text: 'Hi',
      scheduledAt: new Date('2025-01-01T00:00:00.000Z'),
    })

    expect(createMock).toHaveBeenCalledTimes(1)
    expect(createMock).toHaveBeenCalledWith({
      to: 'user@test.com',
      from: 'no-reply@test.com',
      subject: 'Hello',
      html: '<p>Hi</p>',
      text: 'Hi',
      scheduledAt: '2025-01-01T00:00:00.000Z',
    })
  })
})
