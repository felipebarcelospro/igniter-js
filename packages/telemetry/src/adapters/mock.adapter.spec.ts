import { describe, it, expect } from 'vitest'
import { MockTelemetryAdapter } from './mock.adapter'
import type { IgniterTelemetryEnvelope } from '../types/envelope'

describe('MockTelemetryAdapter', () => {
  const createEnvelope = (overrides: Partial<IgniterTelemetryEnvelope> = {}): IgniterTelemetryEnvelope => ({
    name: 'test.event',
    time: '2025-01-01T00:00:00.000Z',
    level: 'info',
    service: 'test-service',
    environment: 'test',
    sessionId: 'ses_test_123',
    ...overrides,
  })

  it('should capture events', () => {
    const adapter = MockTelemetryAdapter.create()
    const envelope = createEnvelope()
    
    adapter.handle(envelope)
    
    expect(adapter.getEvents()).toHaveLength(1)
    expect(adapter.getLastEvent()).toEqual(envelope)
  })

  it('should clear events', () => {
    const adapter = MockTelemetryAdapter.create()
    adapter.handle(createEnvelope())
    
    adapter.clear()
    expect(adapter.getEvents()).toHaveLength(0)
    expect(adapter.getLastEvent()).toBeUndefined()
  })

  it('should implement flush and shutdown as no-ops', async () => {
    const adapter = MockTelemetryAdapter.create()
    await expect(adapter.flush()).resolves.toBeUndefined()
    await expect(adapter.shutdown()).resolves.toBeUndefined()
  })
})
