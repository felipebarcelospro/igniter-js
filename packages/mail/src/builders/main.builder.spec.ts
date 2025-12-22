import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { MockMailAdapter } from '../adapters/mock.adapter'
import { IgniterMailSchema } from '../utils/schema'
import { IgniterMailBuilder } from './main.builder'

vi.mock('@react-email/components', async () => {
  const actual = await vi.importActual<typeof import('@react-email/components')>(
    '@react-email/components',
  )

  return {
    ...actual,
    render: vi.fn().mockResolvedValue('<html></html>'),
  }
})

describe('IgniterMailBuilder', () => {
  it('builds with adapter instance and template', () => {
    const adapter = MockMailAdapter.create()
    const mail = IgniterMailBuilder.create()
      .withFrom('no-reply@example.com')
      .withAdapter(adapter)
      .addTemplate('welcome', {
        subject: 'Welcome',
        schema: IgniterMailSchema.createPassthroughSchema(),
        render: () => React.createElement('div', null, 'hello'),
      })
      .build()

    expect(mail).toBeTruthy()
    expect(typeof mail.send).toBe('function')
  })

  it('supports provider adapter chaining', () => {
    const mail = IgniterMailBuilder.create()
      .withFrom('no-reply@example.com')
      .withAdapter('resend', 'token')
      .addTemplate('ping', {
        subject: 'Ping',
        schema: IgniterMailSchema.createPassthroughSchema(),
        render: () => React.createElement('div', null, 'ping'),
      })
      .build()

    expect(mail).toBeTruthy()
  })

  it('invokes hooks configured on the builder', async () => {
    const adapter = MockMailAdapter.create()
    const onSendStarted = vi.fn()
    const onSendSuccess = vi.fn()

    const mail = IgniterMailBuilder.create()
      .withFrom('no-reply@example.com')
      .withAdapter(adapter)
      .onSendStarted(onSendStarted)
      .onSendSuccess(onSendSuccess)
      .addTemplate('welcome', {
        subject: 'Welcome',
        schema: IgniterMailSchema.createPassthroughSchema(),
        render: () => React.createElement('div', null, 'hello'),
      })
      .build()

    await mail.send({
      to: 'user@example.com',
      template: 'welcome',
      data: {},
    })

    expect(onSendStarted).toHaveBeenCalledTimes(1)
    expect(onSendSuccess).toHaveBeenCalledTimes(1)
  })
})
