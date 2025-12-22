import type { StandardSchemaV1 } from '@igniter-js/core'
import React from 'react'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { IgniterMail } from '../builders/main.builder'
import { IgniterMailError } from '../errors/mail.error'

function createPassSchema(): StandardSchemaV1 {
  return {
    '~standard': {
      validate: async (value: unknown) => ({ value }),
    },
  } as any
}

function createFailSchema(): StandardSchemaV1 {
  return {
    '~standard': {
      validate: async () => ({ issues: [{ message: 'bad' }] }),
    },
  } as any
}

describe('IgniterMail', () => {
  it.skip('renders a template and calls adapter.send()', async () => {
    const send = vi.fn(async (_params: any) => undefined)
    const adapter = { send } as any

    const mail = IgniterMail.create()
      .withFrom('no-reply@test.com')
      .withAdapter(adapter)
      .addTemplate('welcome', {
        subject: 'Welcome',
        schema: createPassSchema(),
        render: ({ name }: any) => <div>Hello {String(name)}</div>,
      })
      .build()

    await mail.send({
      to: 'user@test.com',
      template: 'welcome',
      data: { name: 'Felipe' } as any,
    })

    expect(send).toHaveBeenCalledTimes(1)
    const firstCall = send.mock.calls[0] as any[] | undefined
    expect(firstCall).toBeTruthy()
    const call = (firstCall as any[])[0] as any
    expect(call.to).toBe('user@test.com')
    expect(call.subject).toBe('Welcome')
    expect(call.html).toContain('Hello Felipe')
    expect(call.text).toContain('Hello Felipe')
  })

  it('throws when template is not found', async () => {
    const adapter = { send: vi.fn(async () => undefined) }

    const mail = IgniterMail.create()
      .withFrom('no-reply@test.com')
      .withAdapter(adapter)
      .addTemplate('t', {
        subject: 'T',
        schema: createPassSchema(),
        render: () => React.createElement('div', null, 'x'),
      })
      .build()

    await expect(
      (mail as any).send({
        to: 'user@test.com',
        template: 'missing',
        data: {},
      }),
    ).rejects.toBeInstanceOf(IgniterMailError)
  })

  it('validates template payload when schema provides ~standard.validate', async () => {
    const adapter = { send: vi.fn(async () => undefined) }

    const mail = IgniterMail.create()
      .withFrom('no-reply@test.com')
      .withAdapter(adapter)
      .addTemplate('t', {
        subject: 'T',
        schema: createFailSchema(),
        render: () => React.createElement('div', null, 'x'),
      })
      .build()

    await expect(
      mail.send({ to: 'user@test.com', template: 't', data: { any: true } as any }),
    ).rejects.toMatchObject({ code: 'MAIL_PROVIDER_TEMPLATE_DATA_INVALID' })

    expect(adapter.send).not.toHaveBeenCalled()
  })

  it('enqueues schedule() using the queue adapter when configured', async () => {
    const adapter = { send: vi.fn(async () => undefined) }

    const register = vi.fn(() => ({}) as any)
    const bulkRegister = vi.fn(async () => undefined)
    const invoke = vi.fn(async () => undefined)

    const queueAdapter = {
      register,
      bulkRegister,
      invoke,
    } as any

    const mail = IgniterMail.create()
      .withFrom('no-reply@test.com')
      .withAdapter(adapter)
      .withQueue(queueAdapter, { queue: 'mail', job: 'send' })
      .addTemplate('t', {
        subject: 'T',
        schema: createPassSchema(),
        render: () => React.createElement('div', null, 'x'),
      })
      .build()

    const date = new Date(Date.now() + 60_000)

    await mail.schedule(
      { to: 'user@test.com', template: 't', data: {} as any },
      date,
    )

    expect(register).toHaveBeenCalledTimes(1)
    expect(invoke).toHaveBeenCalledTimes(1)
  })

  it('exposes type inference for templates', () => {
    const adapter = { send: vi.fn(async () => undefined) }

    const mail = IgniterMail.create()
      .withFrom('no-reply@test.com')
      .withAdapter(adapter)
      .addTemplate('welcome', {
        subject: 'Welcome',
        schema: createPassSchema(),
        render: ({ name }: any) => React.createElement('div', null, name),
      })
      .build()

    type Templates = typeof mail.$Infer.Templates
    expectTypeOf<Templates>().toEqualTypeOf<'welcome'>()
  })
})
