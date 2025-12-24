import { beforeEach, describe, expect, it } from 'vitest'

import { IgniterCallerCacheUtils } from './cache'

describe('IgniterCallerCacheUtils', () => {
  beforeEach(async () => {
    await IgniterCallerCacheUtils.clearAll()
  })

  it('stores and retrieves values from memory cache', async () => {
    await IgniterCallerCacheUtils.set('users', { id: '1' }, 60)

    const cached = await IgniterCallerCacheUtils.get<{ id: string }>('users')
    expect(cached).toEqual({ id: '1' })
  })

  it('clears cache entries by key', async () => {
    await IgniterCallerCacheUtils.set('users', { id: '1' }, 60)

    await IgniterCallerCacheUtils.clear('users')
    const cached = await IgniterCallerCacheUtils.get('users')

    expect(cached).toBeUndefined()
  })

  it('clears cache entries by pattern', async () => {
    await IgniterCallerCacheUtils.set('users/1', { id: '1' }, 60)
    await IgniterCallerCacheUtils.set('users/2', { id: '2' }, 60)

    await IgniterCallerCacheUtils.clearPattern('users/*')

    const first = await IgniterCallerCacheUtils.get('users/1')
    const second = await IgniterCallerCacheUtils.get('users/2')

    expect(first).toBeUndefined()
    expect(second).toBeUndefined()
  })
})
