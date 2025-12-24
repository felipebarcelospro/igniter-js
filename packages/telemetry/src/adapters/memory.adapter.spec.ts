import { describe, it, expect } from 'vitest'
import { InMemoryTransportAdapter } from './memory.adapter'
import type { IgniterTelemetryEnvelope } from '../types/envelope'

describe('InMemoryTransportAdapter', () => {
  const createEnvelope = (overrides: Partial<IgniterTelemetryEnvelope> = {}): IgniterTelemetryEnvelope => ({
    name: 'test.event',
    time: '2025-01-01T00:00:00.000Z',
    level: 'info',
    service: 'test-service',
    environment: 'test',
    sessionId: 'ses_test_123',
    ...overrides,
  })

  it('should store events in memory', () => {
    const adapter = InMemoryTransportAdapter.create()
    const envelope = createEnvelope()
    
    adapter.handle(envelope)
    
    expect(adapter.getEvents()).toHaveLength(1)
    expect(adapter.getEvents()[0]).toEqual(envelope)
  })

  it('should clear events', () => {
    const adapter = InMemoryTransportAdapter.create()
    adapter.handle(createEnvelope())
    
    expect(adapter.getEvents()).toHaveLength(1)
    
    adapter.clear()
    expect(adapter.getEvents()).toHaveLength(0)
  })

  it('should return a copy of events', () => {
    const adapter = InMemoryTransportAdapter.create()
    adapter.handle(createEnvelope())
    
    const events = adapter.getEvents()
    events.push(createEnvelope({ name: 'modified' }))
    
    expect(adapter.getEvents()).toHaveLength(1)
  })
})
