import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SentryTransportAdapter } from './sentry.adapter'
import type { IgniterTelemetryEnvelope } from '../types/envelope'

describe('SentryTransportAdapter', () => {
  let mockSentry: any
  let mockScope: any

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
    mockScope = {
      setTag: vi.fn(),
      setUser: vi.fn(),
      setContext: vi.fn(),
    }
    mockSentry = {
      captureException: vi.fn(),
      addBreadcrumb: vi.fn(),
      withScope: vi.fn((cb) => cb(mockScope)),
    }
  })

  it('should add breadcrumb for non-error events', () => {
    const adapter = SentryTransportAdapter.create({ sentry: mockSentry })
    const envelope = createEnvelope({ level: 'info' })
    
    adapter.handle(envelope)
    
    expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({
      message: 'test.event',
      level: 'info'
    }))
    expect(mockSentry.captureException).not.toHaveBeenCalled()
  })

  it('should capture exception for error events', () => {
    const adapter = SentryTransportAdapter.create({ sentry: mockSentry })
    const envelope = createEnvelope({ 
      level: 'error',
      error: { name: 'Error', message: 'Fail', stack: 'stack' }
    })
    
    adapter.handle(envelope)
    
    expect(mockSentry.withScope).toHaveBeenCalled()
    expect(mockScope.setTag).toHaveBeenCalledWith('event_name', 'test.event')
    expect(mockSentry.captureException).toHaveBeenCalledWith(expect.any(Error))
  })

  it('should set user context if actor is present', () => {
    const adapter = SentryTransportAdapter.create({ sentry: mockSentry })
    const envelope = createEnvelope({ 
      level: 'error',
      actor: { type: 'user', id: 'usr_123', tags: { email: 'test@test.com' } }
    })
    
    adapter.handle(envelope)
    
    expect(mockScope.setUser).toHaveBeenCalledWith(expect.objectContaining({
      id: 'usr_123',
      segment: 'user',
      email: 'test@test.com'
    }))
  })
})
