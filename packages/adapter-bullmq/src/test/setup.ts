// Test setup file for BullMQ Adapter
import { vi } from 'vitest'

// Mock global server detection
Object.defineProperty(global, 'window', {
  value: undefined,
  writable: true
})

// Mock console methods to avoid spam in tests
global.console = {
  ...console,
  log: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn()
}

// Set environment variables for tests
process.env.NODE_ENV = 'test'
process.env.REDIS_URL = 'redis://localhost:6379'

// Mock BullMQ modules since they require Redis connection
vi.mock('bullmq', () => {
  const mockJob = {
    id: 'test-job-id',
    name: 'test-job',
    data: { test: true },
    timestamp: Date.now(),
    attemptsMade: 0,
    processedOn: null,
    finishedOn: null,
    failedReason: null,
    returnvalue: null,
    opts: { metadata: {} }
  }

  return {
    Queue: vi.fn().mockImplementation((name, options) => ({
      name,
      options,
      add: vi.fn().mockResolvedValue(mockJob),
      getJobs: vi.fn().mockResolvedValue([mockJob]),
      close: vi.fn().mockResolvedValue(undefined)
    })),
    Worker: vi.fn().mockImplementation((name, processor, options) => ({
      name,
      processor,
      options,
      on: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined)
    })),
    Job: vi.fn().mockImplementation(() => mockJob)
  }
}) 