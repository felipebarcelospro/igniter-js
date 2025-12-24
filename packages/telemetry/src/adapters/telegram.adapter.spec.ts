import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TelegramTransportAdapter } from './telegram.adapter'
import type { IgniterTelemetryEnvelope } from '../types/envelope'

describe('TelegramTransportAdapter', () => {
  const createEnvelope = (overrides: Partial<IgniterTelemetryEnvelope> = {}): IgniterTelemetryEnvelope => ({
    name: 'test.event',
    time: '2025-01-01T00:00:00.000Z',
    level: 'info',
    service: 'test-service',
    environment: 'test',
    sessionId: 'ses_test_123',
    ...overrides,
  })

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true })))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should send notification to Telegram', async () => {
    const adapter = TelegramTransportAdapter.create({ 
      botToken: 'token',
      chatId: '123'
    })
    const envelope = createEnvelope({ level: 'error' })
    
    await adapter.handle(envelope)
    
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('api.telegram.org/bottoken/sendMessage'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('test.event')
      })
    )
    
    const body = JSON.parse((fetch as any).mock.calls[0][1].body)
    expect(body.chat_id).toBe('123')
    expect(body.parse_mode).toBe('HTML')
  })

  it('should respect minLevel', async () => {
    const adapter = TelegramTransportAdapter.create({ 
      botToken: 'token',
      chatId: '123',
      minLevel: 'error'
    })
    
    await adapter.handle(createEnvelope({ level: 'warn' }))
    expect(fetch).not.toHaveBeenCalled()
    
    await adapter.handle(createEnvelope({ level: 'error' }))
    expect(fetch).toHaveBeenCalled()
  })

  it('should format message with HTML', async () => {
    const adapter = TelegramTransportAdapter.create({ 
      botToken: 'token',
      chatId: '123',
      minLevel: 'info'
    })
    const envelope = createEnvelope({ 
      level: 'info',
      error: { name: 'Error', message: 'Fail', stack: 'stack' }
    })
    
    await adapter.handle(envelope)
    
    const body = JSON.parse((fetch as any).mock.calls[0][1].body)
    expect(body.text).toContain('<b>')
    expect(body.text).toContain('Fail')
    expect(body.text).toContain('<pre>')
  })
})
