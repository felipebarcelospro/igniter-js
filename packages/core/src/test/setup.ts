// Test setup file for Vitest
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