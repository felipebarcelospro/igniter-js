import { describe, expect, it } from 'vitest'

import { IgniterCallerBodyUtils } from './body'

describe('IgniterCallerBodyUtils', () => {
  it('detects raw body types', () => {
    expect(IgniterCallerBodyUtils.isRawBody({})).toBe(false)

    if (typeof URLSearchParams !== 'undefined') {
      expect(
        IgniterCallerBodyUtils.isRawBody(new URLSearchParams('a=1')),
      ).toBe(true)
    }

    if (typeof Blob !== 'undefined') {
      expect(
        IgniterCallerBodyUtils.isRawBody(new Blob(['test'])),
      ).toBe(true)
    }

    if (typeof Buffer !== 'undefined') {
      expect(IgniterCallerBodyUtils.isRawBody(Buffer.from('test'))).toBe(true)
    }
  })

  it('removes Content-Type for FormData bodies', () => {
    if (typeof FormData === 'undefined') {
      return
    }

    const form = new FormData()
    const headers = {
      'Content-Type': 'multipart/form-data',
      'X-Test': 'true',
    }

    const normalized = IgniterCallerBodyUtils.normalizeHeadersForBody(headers, form)
    expect(normalized).toEqual({ 'X-Test': 'true' })
  })
})
