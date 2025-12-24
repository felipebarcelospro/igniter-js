import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SlackTransportAdapter } from './slack.adapter'
import type { IgniterTelemetryEnvelope } from '../types/envelope'

describe('SlackTransportAdapter', () => {
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

  it('should send notification to Slack for error level by default', async () => {
    const adapter = SlackTransportAdapter.create({ webhookUrl: 'http://slack.com/webhook' })
    const envelope = createEnvelope({ level: 'error' })
    
    await adapter.handle(envelope)
    
    expect(fetch).toHaveBeenCalledWith('http://slack.com/webhook', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('test.event')
    }))
  })

  it('should not send notification for levels below minLevel', async () => {
    const adapter = SlackTransportAdapter.create({ 
      webhookUrl: 'http://slack.com/webhook',
      minLevel: 'error'
    })
    
    await adapter.handle(createEnvelope({ level: 'info' }))
    expect(fetch).not.toHaveBeenCalled()
    
    await adapter.handle(createEnvelope({ level: 'error' }))
    expect(fetch).toHaveBeenCalled()
  })

  it('should include error details in Slack message', async () => {
    const adapter = SlackTransportAdapter.create({ webhookUrl: 'http://slack.com/webhook' })
    const envelope = createEnvelope({ 
      level: 'error',
      error: { name: 'Error', message: 'Something went wrong', stack: 'stack trace' }
    })
    
    await adapter.handle(envelope)
    
    const body = JSON.parse((fetch as any).mock.calls[0][1].body)
    const blocks = body.attachments[0].blocks
    expect(JSON.stringify(blocks)).toContain('Something went wrong')
    expect(JSON.stringify(blocks)).toContain('stack trace')
  })

  it('should include attributes in Slack message', async () => {
    const adapter = SlackTransportAdapter.create({ 
      webhookUrl: 'http://slack.com/webhook',
      minLevel: 'info'
    })
    const envelope = createEnvelope({ 
      level: 'info',
      attributes: { 'user.id': '123' }
    })
    
    await adapter.handle(envelope)
    
    const body = JSON.parse((fetch as any).mock.calls[0][1].body)
    expect(JSON.stringify(body)).toContain('user.id')
    expect(JSON.stringify(body)).toContain('123')
  })
})
