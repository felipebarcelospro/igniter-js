import { describe, expect, it } from 'vitest'

import { IgniterCallerUrlUtils } from './url'

describe('IgniterCallerUrlUtils', () => {
  it('builds URLs with baseURL and query params', () => {
    const result = IgniterCallerUrlUtils.buildUrl({
      url: '/users',
      baseURL: 'https://api.test',
      query: { q: 'ada', page: 2 },
    })

    expect(result).toContain('https://api.test/users')
    expect(result).toContain('q=ada')
    expect(result).toContain('page=2')
  })

  it('keeps absolute URLs intact', () => {
    const result = IgniterCallerUrlUtils.buildUrl({
      url: 'https://example.com/health',
      baseURL: 'https://api.test',
    })

    expect(result).toBe('https://example.com/health')
  })
})
