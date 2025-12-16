/**
 * @fileoverview Tests for session management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createSession,
  getActiveSession,
  runWithSession,
  type IgniterTelemetrySession,
  type TelemetrySessionState,
} from './session'

describe('Session Management', () => {
  // Mock emit function
  const mockEmit = vi.fn()

  beforeEach(() => {
    mockEmit.mockClear()
  })

  describe('createSession', () => {
    it('should create a session with unique ID', () => {
      const session = createSession(mockEmit)
      const state = session.getState()

      expect(state.sessionId).toMatch(/^ses_/)
      expect(state.startedAt).toBeDefined()
      expect(state.ended).toBe(false)
    })

    it('should create sessions with unique IDs', () => {
      const session1 = createSession(mockEmit)
      const session2 = createSession(mockEmit)

      expect(session1.getState().sessionId).not.toBe(session2.getState().sessionId)
    })
  })

  describe('session.id()', () => {
    it('should allow setting custom session ID', () => {
      const session = createSession(mockEmit)
      session.id('custom-session-id')

      expect(session.getState().sessionId).toBe('custom-session-id')
    })

    it('should be chainable', () => {
      const session = createSession(mockEmit)
      const result = session.id('custom-id')
      expect(result).toBe(session)
    })
  })

  describe('session.actor()', () => {
    it('should set actor information', () => {
      const session = createSession(mockEmit)
      session.actor('user', 'usr_456')

      const state = session.getState()
      expect(state.actor?.type).toBe('user')
      expect(state.actor?.id).toBe('usr_456')
    })

    it('should support tags', () => {
      const session = createSession(mockEmit)
      session.actor('user', 'usr_456', { role: 'admin' })

      const state = session.getState()
      expect(state.actor?.tags?.role).toBe('admin')
    })

    it('should be chainable', () => {
      const session = createSession(mockEmit)
      const result = session.actor('user', 'usr_123')
      expect(result).toBe(session)
    })
  })

  describe('session.scope()', () => {
    it('should set scope information', () => {
      const session = createSession(mockEmit)
      session.scope('organization', 'org_789')

      const state = session.getState()
      expect(state.scope?.type).toBe('organization')
      expect(state.scope?.id).toBe('org_789')
    })

    it('should support tags', () => {
      const session = createSession(mockEmit)
      session.scope('organization', 'org_789', { plan: 'enterprise' })

      const state = session.getState()
      expect(state.scope?.tags?.plan).toBe('enterprise')
    })
  })

  describe('session.attributes()', () => {
    it('should set attributes', () => {
      const session = createSession(mockEmit)
      session.attributes({ 'ctx.feature': 'checkout' })

      const state = session.getState()
      expect(state.attributes?.['ctx.feature']).toBe('checkout')
    })

    it('should merge multiple attribute calls', () => {
      const session = createSession(mockEmit)
      session.attributes({ 'ctx.feature': 'checkout' })
      session.attributes({ 'ctx.version': '2.0' })

      const state = session.getState()
      expect(state.attributes?.['ctx.feature']).toBe('checkout')
      expect(state.attributes?.['ctx.version']).toBe('2.0')
    })
  })

  describe('session.emit()', () => {
    it('should call emit function with session state', () => {
      const session = createSession(mockEmit)
      session.actor('user', 'usr_123')

      session.emit('user.login', { level: 'info', attributes: { 'ctx.user.id': 'usr_123' } })

      expect(mockEmit).toHaveBeenCalledWith(
        'user.login',
        { level: 'info', attributes: { 'ctx.user.id': 'usr_123' } },
        expect.objectContaining({
          sessionId: expect.stringMatching(/^ses_/),
          actor: { type: 'user', id: 'usr_123', tags: undefined },
        })
      )
    })
  })

  describe('session.end()', () => {
    it('should mark session as ended', async () => {
      const session = createSession(mockEmit)
      expect(session.getState().ended).toBe(false)

      await session.end()
      expect(session.getState().ended).toBe(true)
    })

    it('should prevent further modifications after end', async () => {
      const session = createSession(mockEmit)
      await session.end()

      expect(() => session.actor('user', 'usr_123')).toThrow()
      expect(() => session.scope('org', 'org_456')).toThrow()
      expect(() => session.attributes({ key: 'value' })).toThrow()
    })

    it('should prevent emit after end', async () => {
      const session = createSession(mockEmit)
      await session.end()

      expect(() => session.emit('test', { level: 'info' })).toThrow()
    })
  })

  describe('session.run()', () => {
    it('should execute callback and return result', async () => {
      const session = createSession(mockEmit)

      const result = await session.run(async () => {
        return 42
      })

      expect(result).toBe(42)
    })

    it('should make session accessible via getActiveSession', async () => {
      const session = createSession(mockEmit)
      const sessionState = session.getState()

      let capturedState: TelemetrySessionState | undefined

      await session.run(async () => {
        capturedState = getActiveSession()
      })

      expect(capturedState?.sessionId).toBe(sessionState.sessionId)
    })

    it('should propagate errors', async () => {
      const session = createSession(mockEmit)

      await expect(
        session.run(async () => {
          throw new Error('Test error')
        })
      ).rejects.toThrow('Test error')
    })
  })

  describe('session.getState()', () => {
    it('should return copy of state', () => {
      const session = createSession(mockEmit)
      const state1 = session.getState()
      const state2 = session.getState()

      expect(state1).not.toBe(state2)
      expect(state1.sessionId).toBe(state2.sessionId)
    })
  })
})

describe('runWithSession', () => {
  it('should make session state available in callback', async () => {
    const state: TelemetrySessionState = {
      sessionId: 'test-session',
      ended: false,
      startedAt: new Date().toISOString(),
    }

    let capturedState: TelemetrySessionState | undefined

    await runWithSession(state, async () => {
      capturedState = getActiveSession()
    })

    expect(capturedState?.sessionId).toBe('test-session')
  })

  it('should isolate sessions between concurrent runs', async () => {
    const state1: TelemetrySessionState = {
      sessionId: 'session-1',
      ended: false,
      startedAt: new Date().toISOString(),
    }
    const state2: TelemetrySessionState = {
      sessionId: 'session-2',
      ended: false,
      startedAt: new Date().toISOString(),
    }

    const results: string[] = []

    await Promise.all([
      runWithSession(state1, async () => {
        await new Promise((r) => setTimeout(r, 5))
        const active = getActiveSession()
        results.push(`run1: ${active?.sessionId}`)
      }),
      runWithSession(state2, async () => {
        const active = getActiveSession()
        results.push(`run2: ${active?.sessionId}`)
      }),
    ])

    expect(results).toHaveLength(2)
    expect(results.find(r => r.includes('session-1'))).toBeDefined()
    expect(results.find(r => r.includes('session-2'))).toBeDefined()
  })

  it('should return the callback result', async () => {
    const state: TelemetrySessionState = {
      sessionId: 'test',
      ended: false,
      startedAt: new Date().toISOString(),
    }

    const result = await runWithSession(state, async () => {
      return 'hello'
    })

    expect(result).toBe('hello')
  })
})

describe('getActiveSession', () => {
  it('should return undefined outside of session context', () => {
    expect(getActiveSession()).toBeUndefined()
  })
})
