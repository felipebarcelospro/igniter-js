import type { StandardSchemaV1 } from '@igniter-js/core'
import React from 'react'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { IgniterMail } from '../builders/main.builder'
import { IgniterMailError } from '../errors/mail.error'

vi.mock('@react-email/components', () => ({
  render: vi.fn(async () => '<html></html>'),
}))

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

  describe('telemetry', () => {
    const findEmitPayload = (
      telemetry: { emit: ReturnType<typeof vi.fn> },
      event: string,
    ) => {
      const call = telemetry.emit.mock.calls.find(([key]) => key === event)
      expect(call).toBeTruthy()
      return call?.[1] as { level: string; attributes: Record<string, unknown> }
    }

    it('emits send telemetry with expected attributes', async () => {
      const telemetry = { emit: vi.fn() }
      const adapter = { send: vi.fn(async () => undefined) }

      const mail = IgniterMail.create()
        .withFrom('no-reply@test.com')
        .withAdapter(adapter)
        .withTelemetry(telemetry as any)
        .addTemplate('welcome', {
          subject: 'Welcome',
          schema: createPassSchema(),
          render: () => React.createElement('div', null, 'hello'),
        })
        .build()

      await mail.send({
        to: 'user@test.com',
        template: 'welcome',
        data: {} as any,
      })

      const started = findEmitPayload(
        telemetry,
        'igniter.mail.send.started',
      )
      expect(started).toMatchObject({
        level: 'debug',
        attributes: {
          'mail.to': 'user@test.com',
          'mail.template': 'welcome',
        },
      })

      const success = findEmitPayload(
        telemetry,
        'igniter.mail.send.success',
      )
      expect(success).toMatchObject({
        level: 'info',
        attributes: {
          'mail.to': 'user@test.com',
          'mail.template': 'welcome',
          'mail.subject': 'Welcome',
        },
      })
      expect(success.attributes['mail.duration_ms']).toEqual(expect.any(Number))
    })

    it('emits schedule telemetry with expected attributes', async () => {
      const telemetry = { emit: vi.fn() }
      const adapter = { send: vi.fn(async () => undefined) }
      const register = vi.fn(() => ({}) as any)
      const bulkRegister = vi.fn(async () => undefined)
      const invoke = vi.fn(async () => undefined)
      const queueAdapter = { register, bulkRegister, invoke } as any

      const mail = IgniterMail.create()
        .withFrom('no-reply@test.com')
        .withAdapter(adapter)
        .withTelemetry(telemetry as any)
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

      const started = findEmitPayload(
        telemetry,
        'igniter.mail.schedule.started',
      )
      expect(started).toMatchObject({
        level: 'debug',
        attributes: {
          'mail.to': 'user@test.com',
          'mail.template': 't',
          'mail.scheduled_at': date.toISOString(),
        },
      })

      const success = findEmitPayload(
        telemetry,
        'igniter.mail.schedule.success',
      )
      expect(success).toMatchObject({
        level: 'info',
        attributes: {
          'mail.to': 'user@test.com',
          'mail.template': 't',
          'mail.scheduled_at': date.toISOString(),
          'mail.queue_id': 'mail',
        },
      })
      expect(success.attributes['mail.delay_ms']).toEqual(expect.any(Number))
    })

    it('emits send error telemetry with expected attributes', async () => {
      const telemetry = { emit: vi.fn() }
      const adapter = {
        send: vi.fn(async () => {
          throw new Error('boom')
        }),
      }

      const mail = IgniterMail.create()
        .withFrom('no-reply@test.com')
        .withAdapter(adapter)
        .withTelemetry(telemetry as any)
        .addTemplate('welcome', {
          subject: 'Welcome',
          schema: createPassSchema(),
          render: () => React.createElement('div', null, 'hello'),
        })
        .build()

      await expect(
        mail.send({
          to: 'user@test.com',
          template: 'welcome',
          data: {} as any,
        }),
      ).rejects.toBeInstanceOf(IgniterMailError)

      const error = findEmitPayload(
        telemetry,
        'igniter.mail.send.error',
      )

      expect(error).toMatchObject({
        level: 'error',
        attributes: {
          'mail.to': 'user@test.com',
          'mail.template': 'welcome',
          'mail.error.code': 'MAIL_PROVIDER_SEND_FAILED',
          'mail.error.message': 'MAIL_PROVIDER_SEND_FAILED',
        },
      })
      expect(error.attributes['mail.duration_ms']).toEqual(expect.any(Number))
    })

    it('emits schedule error telemetry with expected attributes', async () => {
      const telemetry = { emit: vi.fn() }
      const adapter = { send: vi.fn(async () => undefined) }
      const register = vi.fn(() => ({}) as any)
      const bulkRegister = vi.fn(async () => undefined)
      const invoke = vi.fn(async () => {
        throw new Error('queue failed')
      })
      const queueAdapter = { register, bulkRegister, invoke } as any

      const mail = IgniterMail.create()
        .withFrom('no-reply@test.com')
        .withAdapter(adapter)
        .withTelemetry(telemetry as any)
        .withQueue(queueAdapter, { queue: 'mail', job: 'send' })
        .addTemplate('t', {
          subject: 'T',
          schema: createPassSchema(),
          render: () => React.createElement('div', null, 'x'),
        })
        .build()

      const date = new Date(Date.now() + 60_000)

      await expect(
        mail.schedule({ to: 'user@test.com', template: 't', data: {} as any }, date),
      ).rejects.toBeInstanceOf(IgniterMailError)

      const error = findEmitPayload(
        telemetry,
        'igniter.mail.schedule.error',
      )

      expect(error).toMatchObject({
        level: 'error',
        attributes: {
          'mail.to': 'user@test.com',
          'mail.template': 't',
          'mail.scheduled_at': date.toISOString(),
          'mail.error.code': 'MAIL_PROVIDER_SCHEDULE_FAILED',
          'mail.error.message': 'MAIL_PROVIDER_SCHEDULE_FAILED',
        },
      })
    })
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
