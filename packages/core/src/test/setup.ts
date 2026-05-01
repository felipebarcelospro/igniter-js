// Test setup file for Vitest
import { vi } from 'vitest'

// Ensure `window` does not exist so server-only shims don't throw in tests
if ('window' in globalThis) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete (globalThis as any).window
  } catch {
    // Fall back to removing document access for shims that check window/document
    ;(globalThis as any).window = undefined
  }
}

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
