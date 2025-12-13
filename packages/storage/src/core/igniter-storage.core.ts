import { Buffer } from 'node:buffer'
import type Stream from 'node:stream'
import type { IgniterLogger } from '@igniter-js/core'
import type { IgniterStorageAdapter } from '../adapters/igniter-storage.adapter'
import { IgniterStorageError } from '../errors/igniter-storage.error'
import type { IgniterStorageFile } from '../types/file'
import type { IgniterStorageHooks } from '../types/hooks'
import type {
  IgniterStoragePolicies,
  IgniterStoragePolicyViolation,
} from '../types/policies'
import type { IgniterStorageUploadOptions } from '../types/replace'
import {
  inferContentTypeFromFilename,
  inferExtensionFromContentType,
  normalizeContentType,
} from '../utils/mime'
import {
  getBasename,
  getExtension,
  joinPathSegments,
  splitPath,
} from '../utils/path'
import { ensureTrailingSlash, stripBaseUrlOrThrow } from '../utils/url'

export type IgniterStorageCoreConfig = {
  adapter: IgniterStorageAdapter
  logger?: IgniterLogger

  /** Public base URL (CDN). */
  baseUrl: string

  /** Base path prefix (e.g. `/development`). */
  basePath?: string

  hooks?: IgniterStorageHooks
  policies?: IgniterStoragePolicies
}

export type IgniterStorageResolvedDestination = {
  /** Fully resolved object key (includes basePath). */
  key: string
  /** Basename (filename with extension). */
  basename: string
  /** Filename without folders. */
  name: string
  /** Extension without dot (may be empty). */
  extension: string
}

/**
 * Core orchestration class.
 *
 * All business rules live here:
 * - scopes and path composition
 * - env/builder configuration
 * - policies enforcement
 * - hooks lifecycle
 * - replacement strategies
 * - inference (content-type, extension)
 */
export class IgniterStorageCore {
  private readonly adapter: IgniterStorageAdapter
  private readonly logger?: IgniterLogger
  private readonly baseUrl: string
  private readonly basePath?: string
  private readonly hooks?: IgniterStorageHooks
  private readonly policies?: IgniterStoragePolicies

  constructor(config: IgniterStorageCoreConfig) {
    this.adapter = config.adapter
    this.logger = config.logger
    this.baseUrl = config.baseUrl
    this.basePath = config.basePath
    this.hooks = config.hooks
    this.policies = config.policies
  }

  /**
   * Resolves an input path that can be either a relative path/key or a URL.
   */
  resolvePath(input: string): string {
    const stripped = stripBaseUrlOrThrow({ input, baseUrl: this.baseUrl })

    const base = this.basePath ? joinPathSegments(this.basePath) : ''
    const normalizedInput = joinPathSegments(stripped)

    if (base) {
      if (normalizedInput === base || normalizedInput.startsWith(`${base}/`)) {
        return normalizedInput
      }
    }

    return joinPathSegments(base || undefined, normalizedInput)
  }

  /**
   * Converts a resolved key into a public URL.
   */
  toUrl(key: string): string {
    return new URL(key, ensureTrailingSlash(this.baseUrl)).toString()
  }

  /**
   * Returns file information when it exists, otherwise null.
   */
  async get(pathOrUrl: string): Promise<IgniterStorageFile | null> {
    const key = this.resolvePath(pathOrUrl)

    try {
      const exists = await this.adapter.exists(key)
      if (!exists) {
        return null
      }

      return this.fileFromKey(key)
    } catch (error) {
      if (IgniterStorageError.is(error)) {
        throw error
      }

      throw new IgniterStorageError({
        code: 'IGNITER_STORAGE_GET_FAILED',
        operation: 'get',
        message: (error as Error)?.message ?? 'IGNITER_STORAGE_GET_FAILED',
        cause: error,
        data: { pathOrUrl },
      })
    }
  }

  /**
   * Deletes an object.
   */
  async delete(pathOrUrl: string): Promise<void> {
    const key = this.resolvePath(pathOrUrl)

    try {
      await this.hooks?.onDeleteStarted?.({ operation: 'delete', path: key })
      await this.adapter.delete(key)
      await this.hooks?.onDeleteSuccess?.({ operation: 'delete', path: key })
    } catch (error) {
      await this.hooks?.onDeleteError?.(
        { operation: 'delete', path: key },
        error as Error,
      )

      if (IgniterStorageError.is(error)) {
        throw error
      }

      throw new IgniterStorageError({
        code: 'IGNITER_STORAGE_DELETE_FAILED',
        operation: 'delete',
        message: (error as Error)?.message ?? 'IGNITER_STORAGE_DELETE_FAILED',
        cause: error,
        data: { pathOrUrl },
      })
    }
  }

  /**
   * Lists objects under a prefix.
   */
  async list(prefix?: string): Promise<IgniterStorageFile[]> {
    const resolvedPrefix = prefix
      ? this.resolvePath(prefix)
      : this.basePath
        ? joinPathSegments(this.basePath)
        : undefined

    try {
      const keys = await this.adapter.list(resolvedPrefix)
      return keys.map((key) => this.fileFromKey(key))
    } catch (error) {
      if (IgniterStorageError.is(error)) {
        throw error
      }

      throw new IgniterStorageError({
        code: 'IGNITER_STORAGE_LIST_FAILED',
        operation: 'list',
        message: (error as Error)?.message ?? 'IGNITER_STORAGE_LIST_FAILED',
        cause: error,
        data: { prefix },
      })
    }
  }

  /**
   * Streams an object.
   */
  async stream(pathOrUrl: string): Promise<Stream.Readable> {
    const key = this.resolvePath(pathOrUrl)

    try {
      return await this.adapter.stream(key)
    } catch (error) {
      if (IgniterStorageError.is(error)) {
        throw error
      }

      throw new IgniterStorageError({
        code: 'IGNITER_STORAGE_STREAM_FAILED',
        operation: 'stream',
        message: (error as Error)?.message ?? 'IGNITER_STORAGE_STREAM_FAILED',
        cause: error,
        data: { pathOrUrl },
      })
    }
  }

  /**
   * Uploads from a URL.
   */
  async uploadFromUrl(
    sourceUrl: string,
    destination: string,
    options?: IgniterStorageUploadOptions,
  ): Promise<IgniterStorageFile> {
    let response: Response

    try {
      response = await fetch(sourceUrl)
    } catch (error) {
      throw new IgniterStorageError({
        code: 'IGNITER_STORAGE_FETCH_FAILED',
        operation: 'upload',
        message: (error as Error)?.message ?? 'IGNITER_STORAGE_FETCH_FAILED',
        cause: error,
        data: { sourceUrl },
      })
    }

    if (!response.ok) {
      throw new IgniterStorageError({
        code: 'IGNITER_STORAGE_FETCH_FAILED',
        operation: 'upload',
        message: `IGNITER_STORAGE_FETCH_FAILED: ${response.status}`,
        data: { sourceUrl, status: response.status },
      })
    }

    const headerContentType = response.headers.get('content-type') ?? undefined
    const arrayBuffer = await response.arrayBuffer()

    const contentType = headerContentType
      ? normalizeContentType(headerContentType)
      : 'application/octet-stream'

    const blob = new Blob([arrayBuffer], { type: contentType })

    return this.upload(blob, destination, {
      ...options,
      _source: { kind: 'url', url: sourceUrl },
      _explicitContentType: contentType,
    })
  }

  /**
   * Uploads from a `Uint8Array`/`ArrayBuffer`.
   */
  async uploadFromBuffer(
    buffer: Uint8Array | ArrayBuffer,
    destination: string,
    options?: IgniterStorageUploadOptions & { contentType?: string },
  ): Promise<IgniterStorageFile> {
    const bytes =
      buffer instanceof ArrayBuffer ? Buffer.from(buffer) : Buffer.from(buffer)

    const blob = new Blob([bytes], {
      type: options?.contentType ?? 'application/octet-stream',
    })

    return this.upload(blob, destination, {
      ...options,
      _source: { kind: 'buffer' },
      _explicitContentType: options?.contentType,
    })
  }

  /**
   * Uploads from a base64 payload.
   */
  async uploadFromBase64(
    base64: string,
    destination: string,
    options?: IgniterStorageUploadOptions & { contentType?: string },
  ): Promise<IgniterStorageFile> {
    const normalized = base64.includes(',')
      ? base64.split(',').pop() || ''
      : base64

    const buf = Buffer.from(normalized, 'base64')

    return this.uploadFromBuffer(buf, destination, options)
  }

  /**
   * Uploads a File/Blob/Stream to the resolved destination.
   */
  async upload(
    file: File | Blob | Stream.Readable,
    destination: string,
    options?: IgniterStorageUploadOptions & {
      _explicitContentType?: string
      _source?: { kind: 'file' | 'url' | 'buffer' | 'base64'; url?: string }
    },
  ): Promise<IgniterStorageFile> {
    const resolved = this.resolveDestination(destination, {
      sourceContentType: options?._explicitContentType,
      file,
    })

    const contentType = this.inferContentType({
      destinationBasename: resolved.basename,
      file,
      explicit: options?._explicitContentType,
    })

    const size = file instanceof Blob ? file.size : undefined

    const hookPayload = {
      operation: 'upload' as const,
      path: resolved.key,
      source: options?._source,
      name: resolved.name,
      extension: resolved.extension,
      contentType,
      size,
    }

    try {
      this.assertUploadPolicies({
        filename: resolved.basename,
        contentType,
        size,
      })

      await this.hooks?.onUploadStarted?.(hookPayload)

      if (options?.replace) {
        await this.applyReplaceStrategy({
          resolved,
          strategy: options.replace,
        })
      }

      await this.adapter.put(resolved.key, file, {
        contentType,
        cacheControl: 'public, max-age=31536000',
        public: true,
      })

      const stored = this.fileFromKey(resolved.key, {
        contentType,
        size,
      })

      await this.hooks?.onUploadSuccess?.({ ...hookPayload, file: stored })

      return stored
    } catch (error) {
      await this.hooks?.onUploadError?.(hookPayload, error as Error)

      if (IgniterStorageError.is(error)) {
        throw error
      }

      throw new IgniterStorageError({
        code: 'IGNITER_STORAGE_UPLOAD_FAILED',
        operation: 'upload',
        message: (error as Error)?.message ?? 'IGNITER_STORAGE_UPLOAD_FAILED',
        cause: error,
        data: { destination, resolved },
      })
    }
  }

  async copy(from: string, to: string): Promise<IgniterStorageFile> {
    if (!this.adapter.copy) {
      throw new IgniterStorageError({
        code: 'IGNITER_STORAGE_COPY_NOT_SUPPORTED',
        operation: 'copy',
        message: 'IGNITER_STORAGE_COPY_NOT_SUPPORTED',
      })
    }

    const fromKey = this.resolvePath(from)
    const toKey = this.resolvePath(to)

    try {
      await this.hooks?.onCopyStarted?.({
        operation: 'copy',
        path: toKey,
        from: fromKey,
        to: toKey,
      })

      await this.adapter.copy(fromKey, toKey)

      await this.hooks?.onCopySuccess?.({
        operation: 'copy',
        path: toKey,
        from: fromKey,
        to: toKey,
      })

      return this.fileFromKey(toKey)
    } catch (error) {
      await this.hooks?.onCopyError?.(
        { operation: 'copy', path: toKey, from: fromKey, to: toKey },
        error as Error,
      )

      throw new IgniterStorageError({
        code: 'IGNITER_STORAGE_COPY_FAILED',
        operation: 'copy',
        message: (error as Error)?.message ?? 'IGNITER_STORAGE_COPY_FAILED',
        cause: error,
        data: { from, to },
      })
    }
  }

  async move(from: string, to: string): Promise<IgniterStorageFile> {
    if (!this.adapter.move) {
      throw new IgniterStorageError({
        code: 'IGNITER_STORAGE_MOVE_NOT_SUPPORTED',
        operation: 'move',
        message: 'IGNITER_STORAGE_MOVE_NOT_SUPPORTED',
      })
    }

    const fromKey = this.resolvePath(from)
    const toKey = this.resolvePath(to)

    try {
      await this.hooks?.onMoveStarted?.({
        operation: 'move',
        path: toKey,
        from: fromKey,
        to: toKey,
      })

      await this.adapter.move(fromKey, toKey)

      await this.hooks?.onMoveSuccess?.({
        operation: 'move',
        path: toKey,
        from: fromKey,
        to: toKey,
      })

      return this.fileFromKey(toKey)
    } catch (error) {
      await this.hooks?.onMoveError?.(
        { operation: 'move', path: toKey, from: fromKey, to: toKey },
        error as Error,
      )

      throw new IgniterStorageError({
        code: 'IGNITER_STORAGE_MOVE_FAILED',
        operation: 'move',
        message: (error as Error)?.message ?? 'IGNITER_STORAGE_MOVE_FAILED',
        cause: error,
        data: { from, to },
      })
    }
  }

  private inferContentType(params: {
    destinationBasename: string
    file: File | Blob | Stream.Readable
    explicit?: string
  }): string {
    if (params.explicit) {
      return normalizeContentType(params.explicit)
    }

    if (params.file instanceof Blob && params.file.type) {
      return normalizeContentType(params.file.type)
    }

    const byFilename = inferContentTypeFromFilename(params.destinationBasename)
    return byFilename
      ? normalizeContentType(byFilename)
      : 'application/octet-stream'
  }

  private resolveDestination(
    destination: string,
    params: {
      sourceContentType?: string
      file?: File | Blob | Stream.Readable
    },
  ): IgniterStorageResolvedDestination {
    const normalizedInput = stripBaseUrlOrThrow({
      input: destination,
      baseUrl: this.baseUrl,
    })

    const keyBase = joinPathSegments(this.basePath, normalizedInput)

    const { dir, base } = splitPath(keyBase)
    const ext = getExtension(base)

    const inferredExt =
      ext ||
      this.tryInferExtension({
        destinationBasename: base,
        sourceContentType: params.sourceContentType,
        file: params.file,
      })

    const nameWithoutExt = base && ext ? base.slice(0, -(ext.length + 1)) : base

    const basename = inferredExt && !ext ? `${base}.${inferredExt}` : base

    const key = dir ? `${dir}/${basename}` : basename

    return {
      key,
      basename,
      name: nameWithoutExt,
      extension: inferredExt || ext || '',
    }
  }

  private tryInferExtension(params: {
    destinationBasename: string
    sourceContentType?: string
    file?: File | Blob | Stream.Readable
  }): string {
    // 1) content-type (explicit / fetched)
    if (params.sourceContentType) {
      const ext = inferExtensionFromContentType(params.sourceContentType)
      if (ext) {
        return ext
      }
    }

    // 2) File/Blob type
    if (params.file instanceof Blob && params.file.type) {
      const ext = inferExtensionFromContentType(params.file.type)
      if (ext) {
        return ext
      }
    }

    // 3) destination already has extension (handled elsewhere)
    // 4) fallback: none
    return ''
  }

  private fileFromKey(
    key: string,
    meta?: { contentType?: string; size?: number },
  ): IgniterStorageFile {
    const name = getBasename(key)
    const extension = getExtension(name)

    return {
      path: key,
      url: this.toUrl(key),
      name,
      extension,
      contentType: meta?.contentType,
      size: meta?.size,
    }
  }

  private assertUploadPolicies(payload: {
    filename: string
    contentType: string
    size?: number
  }) {
    const policies = this.policies
    if (!policies) {
      return
    }

    const violations: IgniterStoragePolicyViolation[] = []

    if (
      typeof policies.maxFileSize === 'number' &&
      typeof payload.size === 'number' &&
      payload.size > policies.maxFileSize
    ) {
      violations.push({
        reason: 'MAX_FILE_SIZE_EXCEEDED',
        message: `File size ${payload.size} exceeds max ${policies.maxFileSize}`,
        data: { size: payload.size, maxFileSize: policies.maxFileSize },
      })
    }

    if (
      policies.allowedMimeTypes?.length &&
      payload.contentType &&
      !policies.allowedMimeTypes.includes(payload.contentType)
    ) {
      violations.push({
        reason: 'MIME_TYPE_NOT_ALLOWED',
        message: `Mime type ${payload.contentType} is not allowed`,
        data: {
          contentType: payload.contentType,
          allowed: policies.allowedMimeTypes,
        },
      })
    }

    if (policies.allowedExtensions?.length) {
      const ext = getExtension(payload.filename)
      if (ext && !policies.allowedExtensions.includes(ext)) {
        violations.push({
          reason: 'EXTENSION_NOT_ALLOWED',
          message: `Extension ${ext} is not allowed`,
          data: { extension: ext, allowed: policies.allowedExtensions },
        })
      }
    }

    if (violations.length) {
      throw new IgniterStorageError({
        code: 'IGNITER_STORAGE_UPLOAD_POLICY_VIOLATION',
        operation: 'upload',
        message: 'IGNITER_STORAGE_UPLOAD_POLICY_VIOLATION',
        data: { violations },
      })
    }
  }

  private async applyReplaceStrategy(params: {
    resolved: IgniterStorageResolvedDestination
    strategy: NonNullable<IgniterStorageUploadOptions['replace']>
  }): Promise<void> {
    try {
      const { dir, base } = splitPath(params.resolved.key)
      const basename = base
      const ext = getExtension(basename)
      const nameWithoutExt = ext
        ? basename.slice(0, -(ext.length + 1))
        : basename

      if (params.strategy === 'BY_FILENAME_AND_EXTENSION') {
        // delete exact key
        await this.adapter.delete(params.resolved.key)
        return
      }

      // BY_FILENAME: list directory and delete any matching basename w/ any extension
      const prefix = dir ? `${dir}/` : ''
      const keys = await this.adapter.list(prefix)

      const matches = keys.filter((k) => {
        const b = getBasename(k)
        const e = getExtension(b)
        const n = e ? b.slice(0, -(e.length + 1)) : b
        return n === nameWithoutExt
      })

      await Promise.all(matches.map((k) => this.adapter.delete(k)))
    } catch (error) {
      throw new IgniterStorageError({
        code: 'IGNITER_STORAGE_REPLACE_FAILED',
        operation: 'upload',
        message: (error as Error)?.message ?? 'IGNITER_STORAGE_REPLACE_FAILED',
        cause: error,
        data: { key: params.resolved.key, strategy: params.strategy },
      })
    }
  }
}
