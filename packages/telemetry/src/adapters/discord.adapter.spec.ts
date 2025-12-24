import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { DiscordTransportAdapter } from './discord.adapter'
import type { IgniterTelemetryEnvelope } from '../types/envelope'

describe('DiscordTransportAdapter', () => {
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

  it('should send notification to Discord', async () => {
    const adapter = DiscordTransportAdapter.create({ webhookUrl: 'http://discord.com/webhook' })
    const envelope = createEnvelope({ level: 'error' })
    
    await adapter.handle(envelope)
    
    expect(fetch).toHaveBeenCalledWith('http://discord.com/webhook', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('test.event')
    }))
  })

  it('should respect minLevel', async () => {
    const adapter = DiscordTransportAdapter.create({ 
      webhookUrl: 'http://discord.com/webhook',
      minLevel: 'warn'
    })
    
    await adapter.handle(createEnvelope({ level: 'info' }))
    expect(fetch).not.toHaveBeenCalled()
    
    await adapter.handle(createEnvelope({ level: 'warn' }))
    expect(fetch).toHaveBeenCalled()
  })

  it('should format embed correctly', async () => {
    const adapter = DiscordTransportAdapter.create({ webhookUrl: 'http://discord.com/webhook' })
    const envelope = createEnvelope({ 
      level: 'error',
      attributes: { 'key': 'value' }
    })
    
    await adapter.handle(envelope)
    
    const body = JSON.parse((fetch as any).mock.calls[0][1].body)
    const embed = body.embeds[0]
    expect(embed.title).toContain('ERROR')
    expect(embed.title).toContain('test.event')
    expect(embed.description).toContain('key')
    expect(embed.description).toContain('value')
  })
})
