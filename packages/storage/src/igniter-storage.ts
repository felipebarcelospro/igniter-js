import type Stream from 'node:stream'
import type { IgniterStorageCore } from './core/igniter-storage.core'
import { IgniterStorageError } from './errors/igniter-storage.error'
import type { IgniterStorageFile } from './types/file'
import type { IgniterStorageUploadOptions } from './types/replace'

/**
 * Public runtime class.
 *
 * In the future this folder will be extracted as `@igniter-js/storage`.
 */
export class IgniterStorage<TScopes extends Record<string, any> = Record<string, any>> {
  private readonly core: IgniterStorageCore
  private readonly scopes: Record<string, { path: string; requiresIdentifier: boolean }>

  constructor(params: {
    core: IgniterStorageCore
    scopes: Record<string, { path: string; requiresIdentifier: boolean }>
  }) {
    this.core = params.core
    this.scopes = params.scopes
  }

  /**
   * Creates a scoped client.
   */
  scope<K extends keyof TScopes & string>(
    scopeKey: K,
    ...args: TScopes[K] extends { requiresIdentifier: infer R }
      ? R extends true
        ? [identifier: string]
        : [identifier?: string]
      : [identifier?: string]
  ): IgniterStorageScoped {
    const definition = this.scopes[String(scopeKey)]
    if (!definition) {
      throw new IgniterStorageError({
        code: 'IGNITER_STORAGE_INVALID_SCOPE',
        operation: 'scope',
        message: `Unknown scope: ${String(scopeKey)}`,
        data: { scopeKey },
      })
    }

    const identifier = args[0]
    if (definition.requiresIdentifier && !identifier) {
      throw new IgniterStorageError({
        code: 'IGNITER_STORAGE_SCOPE_IDENTIFIER_REQUIRED',
        operation: 'scope',
        message: `Scope ${String(scopeKey)} requires an identifier`,
        data: { scopeKey },
      })
    }

    const prefix = definition.requiresIdentifier
      ? definition.path.replace('[identifier]', String(identifier))
      : definition.path

    return new IgniterStorageScoped({
      core: this.core,
      prefix,
    })
  }

  /**
   * Adds a prefix path for the next calls.
   */
  path(input: string): IgniterStorageScoped {
    return new IgniterStorageScoped({ core: this.core, prefix: input })
  }

  /**
   * Returns file information when it exists, otherwise null.
   */
  get(pathOrUrl: string): Promise<IgniterStorageFile | null> {
    return this.core.get(pathOrUrl)
  }

  /**
   * Uploads a File/Blob/Stream.
   */
  upload(
    file: File | Blob | Stream.Readable,
    destination: string,
    options?: IgniterStorageUploadOptions,
  ): Promise<IgniterStorageFile> {
    return this.core.upload(file, destination, options)
  }

  uploadFromUrl(
    url: string,
    destination: string,
    options?: IgniterStorageUploadOptions,
  ): Promise<IgniterStorageFile> {
    return this.core.uploadFromUrl(url, destination, options)
  }

  uploadFromBuffer(
    buffer: Uint8Array | ArrayBuffer,
    destination: string,
    options?: IgniterStorageUploadOptions & { contentType?: string },
  ): Promise<IgniterStorageFile> {
    return this.core.uploadFromBuffer(buffer, destination, options)
  }

  uploadFromBase64(
    base64: string,
    destination: string,
    options?: IgniterStorageUploadOptions & { contentType?: string },
  ): Promise<IgniterStorageFile> {
    return this.core.uploadFromBase64(base64, destination, options)
  }

  delete(pathOrUrl: string): Promise<void> {
    return this.core.delete(pathOrUrl)
  }

  list(prefix?: string): Promise<IgniterStorageFile[]> {
    return this.core.list(prefix)
  }

  stream(pathOrUrl: string): Promise<Stream.Readable> {
    return this.core.stream(pathOrUrl)
  }

  copy(from: string, to: string): Promise<IgniterStorageFile> {
    return this.core.copy(from, to)
  }

  move(from: string, to: string): Promise<IgniterStorageFile> {
    return this.core.move(from, to)
  }
}

/**
 * A scoped storage client with an internal prefix.
 */
export class IgniterStorageScoped {
  private readonly core: IgniterStorageCore
  private readonly prefix: string

  constructor(params: { core: IgniterStorageCore; prefix: string }) {
    this.core = params.core
    this.prefix = params.prefix
  }

  /**
   * Creates a nested path scope.
   */
  path(input: string): IgniterStorageScoped {
    const next = [this.prefix, input].filter(Boolean).join('/')
    return new IgniterStorageScoped({ core: this.core, prefix: next })
  }

  private toDestination(destination: string): string {
    const combined = [this.prefix, destination].filter(Boolean).join('/')
    return combined
  }

  get(pathOrUrl: string): Promise<IgniterStorageFile | null> {
    return this.core.get(this.toDestination(pathOrUrl))
  }

  upload(
    file: File | Blob | Stream.Readable,
    destination: string,
    options?: IgniterStorageUploadOptions,
  ): Promise<IgniterStorageFile> {
    return this.core.upload(file, this.toDestination(destination), options)
  }

  uploadFromUrl(
    url: string,
    destination: string,
    options?: IgniterStorageUploadOptions,
  ): Promise<IgniterStorageFile> {
    return this.core.uploadFromUrl(url, this.toDestination(destination), options)
  }

  uploadFromBuffer(
    buffer: Uint8Array | ArrayBuffer,
    destination: string,
    options?: IgniterStorageUploadOptions & { contentType?: string },
  ): Promise<IgniterStorageFile> {
    return this.core.uploadFromBuffer(
      buffer,
      this.toDestination(destination),
      options,
    )
  }

  uploadFromBase64(
    base64: string,
    destination: string,
    options?: IgniterStorageUploadOptions & { contentType?: string },
  ): Promise<IgniterStorageFile> {
    return this.core.uploadFromBase64(
      base64,
      this.toDestination(destination),
      options,
    )
  }

  delete(pathOrUrl: string): Promise<void> {
    return this.core.delete(this.toDestination(pathOrUrl))
  }

  list(prefix?: string): Promise<IgniterStorageFile[]> {
    const p = prefix ? this.toDestination(prefix) : this.prefix
    return this.core.list(p)
  }

  stream(pathOrUrl: string): Promise<Stream.Readable> {
    return this.core.stream(this.toDestination(pathOrUrl))
  }

  copy(from: string, to: string): Promise<IgniterStorageFile> {
    return this.core.copy(this.toDestination(from), this.toDestination(to))
  }

  move(from: string, to: string): Promise<IgniterStorageFile> {
    return this.core.move(this.toDestination(from), this.toDestination(to))
  }
}
