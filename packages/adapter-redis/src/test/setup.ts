// Test setup file for Redis Adapter
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

// Mock ioredis
vi.mock('ioredis', () => {
  const mockRedisInstance = {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    exists: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn(),
    publish: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    on: vi.fn(),
    duplicate: vi.fn(),
    quit: vi.fn(),
  }

  // Mock duplicate to return another mock instance with spies
  mockRedisInstance.duplicate.mockReturnValue({
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    exists: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn(),
    publish: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    on: vi.fn(),
    duplicate: vi.fn(),
    quit: vi.fn(),
  })

  return {
    Redis: vi.fn(() => mockRedisInstance),
  }
}) 