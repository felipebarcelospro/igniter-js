import { describe, expect, it, vi } from 'vitest'
import { SmtpMailAdapter } from './smtp.adapter'

const { sendMailMock, closeMock, createTransportMock } = vi.hoisted(() => {
  const sendMail = vi.fn().mockResolvedValue(undefined)
  const close = vi.fn()
  const createTransport = vi.fn(() => ({
    sendMail,
    close,
  }))

  return {
    sendMailMock: sendMail,
    closeMock: close,
    createTransportMock: createTransport,
  }
})

vi.mock('nodemailer', () => ({
  default: {
    createTransport: createTransportMock,
  },
}))

describe('SmtpMailAdapter', () => {
  it('throws when secret is missing', async () => {
    const adapter = SmtpMailAdapter.create({ from: 'no-reply@test.com' })

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
    const adapter = SmtpMailAdapter.create({ secret: 'smtp://test' })

    await expect(
      adapter.send({
        to: 'user@test.com',
        subject: 'Hello',
        html: '<p>Hi</p>',
        text: 'Hi',
      }),
    ).rejects.toMatchObject({ code: 'MAIL_ADAPTER_CONFIGURATION_INVALID' })
  })

  it('sends using nodemailer when configured', async () => {
    const adapter = SmtpMailAdapter.create({
      secret: 'smtp://test',
      from: 'no-reply@test.com',
    })

    await adapter.send({
      to: 'user@test.com',
      subject: 'Hello',
      html: '<p>Hi</p>',
      text: 'Hi',
    })

    expect(createTransportMock).toHaveBeenCalledTimes(1)
    expect(sendMailMock).toHaveBeenCalledTimes(1)
    expect(closeMock).toHaveBeenCalledTimes(1)
  })

  it('throws when nodemailer fails', async () => {
    sendMailMock.mockRejectedValueOnce(new Error('smtp down'))

    const adapter = SmtpMailAdapter.create({
      secret: 'smtp://test',
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
  })
})
