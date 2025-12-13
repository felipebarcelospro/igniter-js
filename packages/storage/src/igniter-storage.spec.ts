import { Readable } from 'node:stream'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IgniterStorageAdapter } from './adapters/igniter-storage.adapter'
import { IgniterStorageBuilder } from './builder/igniter-storage.builder'
import { IgniterStorageError } from './errors/igniter-storage.error'

class InMemoryAdapter extends IgniterStorageAdapter {
  protected readonly objects = new Map<
    string,
    { bytes: Buffer; contentType: string }
  >()

  keys(): string[] {
    return Array.from(this.objects.keys())
  }

  async put(
    key: string,
    body: File | Blob | Uint8Array | ArrayBuffer | Readable,
    options: { contentType: string },
  ): Promise<void> {
    const normalizedKey = this.normalizeKey(key)

    const bytes = await (async () => {
      if (body instanceof Uint8Array) {
        return Buffer.from(body)
      }

      if (body instanceof ArrayBuffer) {
        return Buffer.from(body)
      }

      if (body instanceof Blob) {
        return Buffer.from(await body.arrayBuffer())
      }

      // Readable stream
      const chunks: Buffer[] = []
      for await (const chunk of body) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
      }
      return Buffer.concat(chunks)
    })()

    this.objects.set(normalizedKey, { bytes, contentType: options.contentType })
  }

  async delete(key: string): Promise<void> {
    this.objects.delete(this.normalizeKey(key))
  }

  async list(prefix?: string): Promise<string[]> {
    const p = prefix ? this.normalizeKey(prefix) : ''
    return Array.from(this.objects.keys()).filter((k) =>
      p ? k.startsWith(p) : true,
    )
  }

  async exists(key: string): Promise<boolean> {
    return this.objects.has(this.normalizeKey(key))
  }

  async stream(key: string): Promise<Readable> {
    const v = this.objects.get(this.normalizeKey(key))
    if (!v) {
      return Readable.from([])
    }
    return Readable.from([v.bytes])
  }
}

class InMemoryCopyMoveAdapter extends InMemoryAdapter {
  async copy(fromKey: string, toKey: string): Promise<void> {
    const from = this.normalizeKey(fromKey)
    const to = this.normalizeKey(toKey)

    const src = this.objects.get(from)

    if (!src) {
      throw new Error('SOURCE_NOT_FOUND')
    }

    this.objects.set(to, {
      bytes: Buffer.from(src.bytes),
      contentType: src.contentType,
    })
  }

  async move(fromKey: string, toKey: string): Promise<void> {
    await this.copy(fromKey, toKey)
    await this.delete(fromKey)
  }
}

class SpyAdapter extends InMemoryCopyMoveAdapter {
  public readonly putCalls: Array<{
    key: string
    options: any
  }> = []

  public readonly deleteCalls: Array<{ key: string }> = []
  public readonly listCalls: Array<{ prefix?: string }> = []
  public readonly existsCalls: Array<{ key: string }> = []
  public readonly streamCalls: Array<{ key: string }> = []
  public readonly copyCalls: Array<{ fromKey: string; toKey: string }> = []
  public readonly moveCalls: Array<{ fromKey: string; toKey: string }> = []

  async put(
    key: string,
    body: File | Blob | Uint8Array | ArrayBuffer | Readable,
    options: any,
  ): Promise<void> {
    this.putCalls.push({ key, options })
    return super.put(key, body, options)
  }

  async delete(key: string): Promise<void> {
    this.deleteCalls.push({ key })
    return super.delete(key)
  }

  async list(prefix?: string): Promise<string[]> {
    this.listCalls.push({ prefix })
    return super.list(prefix)
  }

  async exists(key: string): Promise<boolean> {
    this.existsCalls.push({ key })
    return super.exists(key)
  }

  async stream(key: string): Promise<Readable> {
    this.streamCalls.push({ key })
    return super.stream(key)
  }

  async copy(fromKey: string, toKey: string): Promise<void> {
    this.copyCalls.push({ fromKey, toKey })
    return super.copy(fromKey, toKey)
  }

  async move(fromKey: string, toKey: string): Promise<void> {
    this.moveCalls.push({ fromKey, toKey })
    return super.move(fromKey, toKey)
  }
}

async function readStreamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

describe('IgniterStorage (core behaviors)', () => {
  const originalEnv = process.env
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    process.env = { ...originalEnv }
    vi.restoreAllMocks()
  })

  afterEach(() => {
    process.env = originalEnv
    globalThis.fetch = originalFetch
  })

  it('get() returns null when missing and file when present', async () => {
    const adapter = new InMemoryAdapter()

    const storage = IgniterStorageBuilder.create()
      .withAdapter(adapter)
      .withUrl('https://cdn.example.com')
      .withPath('/development')
      .build()

    await expect(storage.get('public/missing.png')).resolves.toBeNull()

    const file = await storage.uploadFromBuffer(
      new Uint8Array([1, 2, 3]),
      'public/avatar.png',
      { contentType: 'image/png' },
    )

    expect(file.path).toBe('development/public/avatar.png')
    expect(file.url).toBe(
      'https://cdn.example.com/development/public/avatar.png',
    )

    const got = await storage.get('public/avatar.png')
    expect(got?.path).toBe('development/public/avatar.png')
  })

  it('infers extension from content-type when destination has no extension', async () => {
    const adapter = new InMemoryAdapter()

    const storage = IgniterStorageBuilder.create()
      .withAdapter(adapter)
      .withUrl('https://cdn.example.com')
      .build()

    const file = await storage.uploadFromBuffer(
      new Uint8Array([1, 2, 3]),
      'profile',
      { contentType: 'image/png' },
    )

    expect(file.path).toBe('profile.png')
    expect(file.name).toBe('profile.png')
    expect(file.extension).toBe('png')
  })

  it('calls adapter.put with resolved key + cache/public options', async () => {
    const adapter = new SpyAdapter()

    const storage = IgniterStorageBuilder.create()
      .withAdapter(adapter)
      .withUrl('https://cdn.example.com')
      .withPath('/development')
      .build()

    const file = await storage.uploadFromBuffer(new Uint8Array([1, 2, 3]), 'a', {
      contentType: 'image/png',
    })

    expect(file.path).toBe('development/a.png')

    expect(adapter.putCalls.length).toBe(1)
    expect(adapter.putCalls[0]?.key).toBe('development/a.png')
    expect(adapter.putCalls[0]?.options).toMatchObject({
      contentType: 'image/png',
      cacheControl: 'public, max-age=31536000',
      public: true,
    })
  })

  it('infers content-type from destination filename when Blob has no type', async () => {
    const adapter = new SpyAdapter()

    const storage = IgniterStorageBuilder.create()
      .withAdapter(adapter)
      .withUrl('https://cdn.example.com')
      .build()

    const blob = new Blob([new Uint8Array([1, 2, 3])])
    const file = await storage.upload(blob, 'public/image.png')

    expect(file.contentType).toBe('image/png')
    expect(adapter.putCalls[0]?.options?.contentType).toBe('image/png')
  })

  it('throws a typed error when a URL path has a different hostname than baseUrl', async () => {
    const adapter = new InMemoryAdapter()

    const storage = IgniterStorageBuilder.create()
      .withAdapter(adapter)
      .withUrl('https://cdn.example.com')
      .build()

    await expect(
      storage.upload(
        new Blob(['x'], { type: 'text/plain' }),
        'https://evil.com/a.txt',
      ),
    ).rejects.toMatchObject({
      name: 'IgniterStorageError',
      code: 'IGNITER_STORAGE_INVALID_PATH_HOST',
      operation: 'path',
    })
  })

  it('supports scopes + nested path() + destination with folders', async () => {
    const adapter = new InMemoryAdapter()

    const storage = IgniterStorageBuilder.create()
      .withAdapter(adapter)
      .withUrl('https://cdn.example.com')
      .addScope('user', '/user/[identifier]')
      .build()

    const file = await storage
      .scope('user', '123')
      .path('/videos')
      .uploadFromBuffer(new Uint8Array([1]), 'assets/avatar', {
        contentType: 'image/png',
      })

    expect(file.path).toBe('user/123/videos/assets/avatar.png')
  })

  it('replace=BY_FILENAME deletes any matching basename regardless extension', async () => {
    const adapter = new SpyAdapter()

    const storage = IgniterStorageBuilder.create()
      .withAdapter(adapter)
      .withUrl('https://cdn.example.com')
      .addScope('user', '/user/[identifier]')
      .build()

    // Seed two files with same basename, different extensions
    await storage
      .scope('user', '123')
      .uploadFromBuffer(new Uint8Array([1]), 'videos/profile.png', {
        contentType: 'image/png',
      })
    await storage
      .scope('user', '123')
      .uploadFromBuffer(new Uint8Array([2]), 'videos/profile.jpg', {
        contentType: 'image/jpeg',
      })

    const before = await storage.list('user/123/videos/')
    expect(before.map((f) => f.path).sort()).toEqual(
      ['user/123/videos/profile.jpg', 'user/123/videos/profile.png'].sort(),
    )

    await storage
      .scope('user', '123')
      .uploadFromBuffer(new Uint8Array([9]), 'videos/profile', {
        contentType: 'image/png',
        replace: 'BY_FILENAME',
      })

    const after = await storage.list('user/123/videos/')
    expect(after.map((f) => f.path)).toEqual(['user/123/videos/profile.png'])

    // ensures replace strategy lists folder prefix and deletes matching keys
    expect(adapter.listCalls.some((c) => c.prefix === 'user/123/videos/')).toBe(
      true,
    )
    expect(
      adapter.deleteCalls.some((c) => c.key === 'user/123/videos/profile.png'),
    ).toBe(true)
    expect(
      adapter.deleteCalls.some((c) => c.key === 'user/123/videos/profile.jpg'),
    ).toBe(true)
  })

  it('replace=BY_FILENAME_AND_EXTENSION only deletes the exact key', async () => {
    const adapter = new InMemoryAdapter()

    const storage = IgniterStorageBuilder.create()
      .withAdapter(adapter)
      .withUrl('https://cdn.example.com')
      .addScope('user', '/user/[identifier]')
      .build()

    await storage
      .scope('user', '123')
      .uploadFromBuffer(new Uint8Array([1]), 'videos/profile.png', {
        contentType: 'image/png',
      })
    await storage
      .scope('user', '123')
      .uploadFromBuffer(new Uint8Array([2]), 'videos/profile.jpg', {
        contentType: 'image/jpeg',
      })

    await storage
      .scope('user', '123')
      .uploadFromBuffer(new Uint8Array([9]), 'videos/profile.png', {
        contentType: 'image/png',
        replace: 'BY_FILENAME_AND_EXTENSION',
      })

    const after = await storage.list('user/123/videos/')
    expect(after.map((f) => f.path).sort()).toEqual(
      ['user/123/videos/profile.jpg', 'user/123/videos/profile.png'].sort(),
    )
  })

  it('throws typed scope errors (invalid scope and missing identifier)', async () => {
    const adapter = new InMemoryAdapter()

    const storage = IgniterStorageBuilder.create()
      .withAdapter(adapter)
      .withUrl('https://cdn.example.com')
      .addScope('user', '/user/[identifier]')
      .addScope('public', '/public')
      .build()

    expect(() => storage.scope('unknown' as any)).toThrowError(
      IgniterStorageError,
    )
    expect(() => storage.scope('public' as any)).not.toThrow()

    expect(() => storage.scope('user' as any)).toThrowError(IgniterStorageError)
    expect(() => storage.scope('user' as any, '123')).not.toThrow()
  })

  it('supports env var fallbacks for url/basePath/policies', async () => {
    process.env.IGNITER_STORAGE_URL = 'https://cdn.example.com'
    process.env.IGNITER_STORAGE_BASE_PATH = '/env-base'
    process.env.IGNITER_STORAGE_MAX_FILE_SIZE = '3'

    const adapter = new InMemoryAdapter()

    const storage = IgniterStorageBuilder.create().withAdapter(adapter).build()

    const file = await storage.uploadFromBuffer(new Uint8Array([1, 2, 3]), 'a', {
      contentType: 'image/png',
    })

    expect(file.path).toBe('env-base/a.png')

    await expect(
      storage.uploadFromBuffer(new Uint8Array([1, 2, 3, 4]), 'b.png', {
        contentType: 'image/png',
      }),
    ).rejects.toMatchObject({
      name: 'IgniterStorageError',
      code: 'IGNITER_STORAGE_UPLOAD_POLICY_VIOLATION',
      operation: 'upload',
    })
  })

  it('enforces allowedMimeTypes policy', async () => {
    const adapter = new InMemoryAdapter()

    const storage = IgniterStorageBuilder.create()
      .withAdapter(adapter)
      .withUrl('https://cdn.example.com')
      .withAllowedMimeTypes(['image/png'])
      .build()

    await expect(
      storage.uploadFromBuffer(new Uint8Array([1]), 'a.jpg', {
        contentType: 'image/jpeg',
      }),
    ).rejects.toMatchObject({
      name: 'IgniterStorageError',
      code: 'IGNITER_STORAGE_UPLOAD_POLICY_VIOLATION',
    })
  })

  it('runs upload hooks (started/success) and preserves returned path without baseUrl', async () => {
    const adapter = new InMemoryAdapter()
    const calls: string[] = []

    const storage = IgniterStorageBuilder.create()
      .withAdapter(adapter)
      .withUrl('https://cdn.example.com')
      .onUploadStarted(() => {
        calls.push('started')
      })
      .onUploadSuccess((payload) => {
        calls.push('success')
        expect(payload.file.path).toBe('public/x.png')
      })
      .build()

    const file = await storage.uploadFromBuffer(new Uint8Array([1]), 'public/x', {
      contentType: 'image/png',
    })

    expect(file.path).toBe('public/x.png')
    expect(file.url).toBe('https://cdn.example.com/public/x.png')
    expect(calls).toEqual(['started', 'success'])
  })

  it('uploadFromUrl infers extension from response content-type and uses fetch', async () => {
    const adapter = new InMemoryAdapter()

    globalThis.fetch = vi.fn(async () => {
      return new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { 'content-type': 'image/png' },
      })
    }) as any

    const storage = IgniterStorageBuilder.create()
      .withAdapter(adapter)
      .withUrl('https://cdn.example.com')
      .build()

    const file = await storage.uploadFromUrl(
      'https://origin.example.com/img',
      'public/profile',
    )

    expect(file.path).toBe('public/profile.png')
    expect(file.extension).toBe('png')
    expect((globalThis.fetch as any).mock.calls.length).toBe(1)
  })

  it('build() throws a typed error when url is missing (no builder url and no env)', async () => {
    delete process.env.IGNITER_STORAGE_URL
    const adapter = new InMemoryAdapter()

    expect(() => IgniterStorageBuilder.create().withAdapter(adapter).build())
      .toThrowError(IgniterStorageError)
  })

  it('get() accepts absolute URL from the configured baseUrl', async () => {
    const adapter = new InMemoryAdapter()

    const storage = IgniterStorageBuilder.create()
      .withAdapter(adapter)
      .withUrl('https://cdn.example.com')
      .withPath('/development')
      .build()

    const uploaded = await storage.uploadFromBuffer(
      new Uint8Array([1]),
      'public/a',
      { contentType: 'image/png' },
    )

    const got = await storage.get(uploaded.url)
    expect(got?.path).toBe('development/public/a.png')
  })

  it('delete() accepts absolute URL and removes the object (hooks start/success)', async () => {
    const adapter = new SpyAdapter()
    const calls: string[] = []

    const storage = IgniterStorageBuilder.create()
      .withAdapter(adapter)
      .withUrl('https://cdn.example.com')
      .onDeleteStarted(() => {
        calls.push('delete-start')
      })
      .onDeleteSuccess(() => {
        calls.push('delete-success')
      })
      .build()

    const file = await storage.uploadFromBuffer(new Uint8Array([1]), 'a', {
      contentType: 'image/png',
    })

    await storage.delete(file.url)
    await expect(storage.get(file.path)).resolves.toBeNull()
    expect(calls).toEqual(['delete-start', 'delete-success'])

    expect(adapter.deleteCalls.some((c) => c.key === 'a.png')).toBe(true)
  })

  it('stream() returns the uploaded bytes (works with URL input too)', async () => {
    const adapter = new SpyAdapter()

    const storage = IgniterStorageBuilder.create()
      .withAdapter(adapter)
      .withUrl('https://cdn.example.com')
      .build()

    const bytes = new Uint8Array([1, 2, 3, 4])
    const file = await storage.uploadFromBuffer(bytes, 'public/bin', {
      contentType: 'application/octet-stream',
    })

    const stream = await storage.stream(file.url)
    const out = await readStreamToBuffer(stream as Readable)
    expect(out).toEqual(Buffer.from(bytes))

    expect(adapter.streamCalls.map((c) => c.key)).toEqual([file.path])
  })

  it('list() returns files under prefix and uses basePath when prefix is omitted', async () => {
    const adapter = new SpyAdapter()

    const storage = IgniterStorageBuilder.create()
      .withAdapter(adapter)
      .withUrl('https://cdn.example.com')
      .withPath('/development')
      .build()

    await storage.uploadFromBuffer(new Uint8Array([1]), 'public/a', {
      contentType: 'image/png',
    })
    await storage.uploadFromBuffer(new Uint8Array([2]), 'private/b', {
      contentType: 'image/png',
    })

    const all = await storage.list()
    expect(all.map((f) => f.path).sort()).toEqual(
      ['development/public/a.png', 'development/private/b.png'].sort(),
    )

    const onlyPublic = await storage.list('public/')
    expect(onlyPublic.map((f) => f.path)).toEqual(['development/public/a.png'])

    // list() with omitted prefix uses basePath
    expect(adapter.listCalls.map((c) => c.prefix)).toContain('development')
    expect(adapter.listCalls.map((c) => c.prefix)).toContain('development/public')
  })

  it('uploadFromBase64 stores contentType and bytes', async () => {
    const adapter = new InMemoryAdapter()

    const storage = IgniterStorageBuilder.create()
      .withAdapter(adapter)
      .withUrl('https://cdn.example.com')
      .build()

    const base64 = Buffer.from('hello').toString('base64')
    const file = await storage.uploadFromBase64(base64, 'docs/hello.txt', {
      contentType: 'text/plain',
    })

    expect(file.contentType).toBe('text/plain')
    const stream = await storage.stream(file.path)
    const out = await readStreamToBuffer(stream as Readable)
    expect(out.toString('utf8')).toBe('hello')
  })

  it('uploadFromUrl throws a typed error when fetch returns !ok', async () => {
    const adapter = new InMemoryAdapter()

    globalThis.fetch = vi.fn(async () => {
      return new Response(new Uint8Array([1]), {
        status: 404,
        headers: { 'content-type': 'image/png' },
      })
    }) as any

    const storage = IgniterStorageBuilder.create()
      .withAdapter(adapter)
      .withUrl('https://cdn.example.com')
      .build()

    await expect(
      storage.uploadFromUrl('https://origin.example.com/missing', 'x'),
    ).rejects.toMatchObject({
      name: 'IgniterStorageError',
      code: 'IGNITER_STORAGE_FETCH_FAILED',
      operation: 'upload',
    })
  })

  it('copy/move throw NOT_SUPPORTED when adapter lacks the capability', async () => {
    const adapter = new InMemoryAdapter()

    const storage = IgniterStorageBuilder.create()
      .withAdapter(adapter)
      .withUrl('https://cdn.example.com')
      .build()

    await expect(storage.copy('a', 'b')).rejects.toMatchObject({
      name: 'IgniterStorageError',
      code: 'IGNITER_STORAGE_COPY_NOT_SUPPORTED',
      operation: 'copy',
    })

    await expect(storage.move('a', 'b')).rejects.toMatchObject({
      name: 'IgniterStorageError',
      code: 'IGNITER_STORAGE_MOVE_NOT_SUPPORTED',
      operation: 'move',
    })
  })

  it('copy/move work when adapter supports the capability (hooks included)', async () => {
    const adapter = new InMemoryCopyMoveAdapter()
    const calls: string[] = []

    const storage = IgniterStorageBuilder.create()
      .withAdapter(adapter)
      .withUrl('https://cdn.example.com')
      .onCopyStarted(() => {
        calls.push('copy-start')
      })
      .onCopySuccess(() => {
        calls.push('copy-success')
      })
      .onMoveStarted(() => {
        calls.push('move-start')
      })
      .onMoveSuccess(() => {
        calls.push('move-success')
      })
      .build()

    await storage.uploadFromBuffer(new Uint8Array([1]), 'a.txt', {
      contentType: 'text/plain',
    })

    const copied = await storage.copy('a.txt', 'b.txt')
    expect(copied.path).toBe('b.txt')
    await expect(storage.get('a.txt')).resolves.not.toBeNull()
    await expect(storage.get('b.txt')).resolves.not.toBeNull()

    const moved = await storage.move('a.txt', 'c.txt')
    expect(moved.path).toBe('c.txt')
    await expect(storage.get('a.txt')).resolves.toBeNull()
    await expect(storage.get('c.txt')).resolves.not.toBeNull()

    expect(calls).toEqual(['copy-start', 'copy-success', 'move-start', 'move-success'])
  })

  it('copy/move resolve keys (basePath + url inputs) before calling adapter', async () => {
    const adapter = new SpyAdapter()

    const storage = IgniterStorageBuilder.create()
      .withAdapter(adapter)
      .withUrl('https://cdn.example.com')
      .withPath('/development')
      .build()

    const src = await storage.uploadFromBuffer(new Uint8Array([1]), 'a.txt', {
      contentType: 'text/plain',
    })

    await storage.copy(src.url, 'b.txt')
    expect(adapter.copyCalls[0]).toMatchObject({
      fromKey: 'development/a.txt',
      toKey: 'development/b.txt',
    })

    await storage.move('b.txt', 'c.txt')
    expect(adapter.moveCalls[0]).toMatchObject({
      fromKey: 'development/b.txt',
      toKey: 'development/c.txt',
    })
  })
})
