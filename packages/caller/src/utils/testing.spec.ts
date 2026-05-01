import { describe, expect, it } from 'vitest'

import { IgniterCallerHttpMock } from './testing'

describe('IgniterCallerHttpMock', () => {
  it('creates mock responses', () => {
    const result = IgniterCallerHttpMock.mockResponse({ ok: true })
    expect(result.data).toEqual({ ok: true })
    expect(result.error).toBeUndefined()
  })

  it('creates mock errors', () => {
    const result = IgniterCallerHttpMock.mockError('IGNITER_CALLER_UNKNOWN_ERROR')
    expect(result.data).toBeUndefined()
    expect(result.error?.code).toBe('IGNITER_CALLER_UNKNOWN_ERROR')
  })

  it('creates mock file responses', () => {
    const result = IgniterCallerHttpMock.mockFile('file.txt', 'content')
    expect(result.error).toBeNull()
    expect(result.file?.name).toBe('file.txt')
  })
})
