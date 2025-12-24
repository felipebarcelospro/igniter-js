import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { HttpTransportAdapter } from './http.adapter'
import type { IgniterTelemetryEnvelope } from '../types/envelope'

describe('HttpTransportAdapter', () => {
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

  it('should send event via fetch', async () => {
    const adapter = HttpTransportAdapter.create({ url: 'http://localhost/telemetry' })
    const envelope = createEnvelope()
    
    await adapter.handle(envelope)
    
    expect(fetch).toHaveBeenCalledWith('http://localhost/telemetry', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(envelope),
      headers: expect.objectContaining({
        'Content-Type': 'application/json'
      })
    }))
  })

  it('should include custom headers', async () => {
    const adapter = HttpTransportAdapter.create({ 
      url: 'http://localhost/telemetry',
      headers: { 'X-API-Key': 'secret' }
    })
    
    await adapter.handle(createEnvelope())
    
    expect(fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      headers: expect.objectContaining({
        'X-API-Key': 'secret'
      })
    }))
  })

  it('should handle fetch errors gracefully', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('Network error'))))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    const adapter = HttpTransportAdapter.create({ url: 'http://localhost/telemetry' })
    await adapter.handle(createEnvelope())
    
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('HTTP Transport failed'), expect.any(Error))
  })

  it('should handle non-ok responses gracefully', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, status: 500 })))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    const adapter = HttpTransportAdapter.create({ url: 'http://localhost/telemetry' })
    await adapter.handle(createEnvelope())
    
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('HTTP Transport failed'), expect.any(Error))
  })
})
