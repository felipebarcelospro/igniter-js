import { describe, expect, it } from 'vitest'

import { IgniterCallerMock } from './testing'

describe('IgniterCallerMock', () => {
  it('creates mock responses', () => {
    const result = IgniterCallerMock.mockResponse({ ok: true })
    expect(result.data).toEqual({ ok: true })
    expect(result.error).toBeUndefined()
  })

  it('creates mock errors', () => {
    const result = IgniterCallerMock.mockError('IGNITER_CALLER_UNKNOWN_ERROR')
    expect(result.data).toBeUndefined()
    expect(result.error?.code).toBe('IGNITER_CALLER_UNKNOWN_ERROR')
  })

  it('creates mock file responses', () => {
    const result = IgniterCallerMock.mockFile('file.txt', 'content')
    expect(result.error).toBeNull()
    expect(result.file?.name).toBe('file.txt')
  })
})
