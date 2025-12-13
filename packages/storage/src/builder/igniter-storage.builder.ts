import type { IgniterLogger } from '@igniter-js/core'
import { IgniterGoogleAdapter } from '../adapters/google-cloud.adapter'
import { IgniterStorageAdapter } from '../adapters/igniter-storage.adapter'
import { IgniterS3Adapter } from '../adapters/s3.adapter'
import { IgniterStorageCore } from '../core/igniter-storage.core'
import { IgniterStorageError } from '../errors/igniter-storage.error'
import { IgniterStorage } from '../igniter-storage'
import type { IgniterStorageHooks } from '../types/hooks'
import type { IgniterStoragePolicies } from '../types/policies'
import type {
  ContainsIdentifier,
  IgniterStorageScopeDefinition,
  IgniterStorageScopes,
} from '../types/scopes'
import { readIgniterStorageEnv } from '../utils/env'

export type IgniterStorageAdapterKey = 's3' | 'google'

export type IgniterStorageS3Credentials = {
  endpoint?: string
  region?: string
  bucket?: string
  accessKeyId?: string
  secretAccessKey?: string
  signatureVersion?: string
}

export type IgniterStorageGoogleCredentials = {
  bucket?: string
  endpoint?: string
  region?: string
  /** JSON string credentials. */
  credentialsJson?: string
  /** Base64 JSON credentials. */
  credentialsJsonBase64?: string
}

export type IgniterStorageAdapterCredentialsMap = {
  s3: IgniterStorageS3Credentials
  google: IgniterStorageGoogleCredentials
}

export type IgniterStorageAdapterFactoryMap = {
  s3: (credentials: IgniterStorageS3Credentials) => IgniterStorageAdapter
  google: (
    credentials: IgniterStorageGoogleCredentials,
  ) => IgniterStorageAdapter
}

export type IgniterStorageBuilderState = {
  adapter?: IgniterStorageAdapter
  adapterKey?: IgniterStorageAdapterKey
  adapterCredentials?: IgniterStorageAdapterCredentialsMap[IgniterStorageAdapterKey]

  baseUrl?: string
  basePath?: string

  logger?: IgniterLogger
  hooks?: IgniterStorageHooks
  policies?: IgniterStoragePolicies

  scopes: Record<string, { path: string; requiresIdentifier: boolean }>

  adapterFactories?: Partial<IgniterStorageAdapterFactoryMap>
}

type DefaultScopePath<K extends string> = `/${K}`

type ScopeDefFromPath<P extends string> = IgniterStorageScopeDefinition<P>

type AddScopeResult<
  TScopes extends IgniterStorageScopes,
  K extends string,
  P extends string,
> = TScopes & Record<K, ScopeDefFromPath<P>>

/**
 * Builder used by developers to initialize storage.
 */
export class IgniterStorageBuilder<TScopes extends IgniterStorageScopes> {
  private readonly state: IgniterStorageBuilderState

  constructor(state: IgniterStorageBuilderState) {
    this.state = state
  }

  /**
   * Creates a new builder instance.
   */
  static create(): IgniterStorageBuilder<Record<string, never>> {
    return new IgniterStorageBuilder({
      scopes: {},
      adapterFactories: {
        s3: (credentials) => IgniterS3Adapter.create(credentials),
        google: (credentials) => IgniterGoogleAdapter.create(credentials),
      },
    })
  }

  /**
   * Registers adapter factories so `withAdapter('s3', credentials)` can be used.
   */
  withAdapterFactories(
    factories: Partial<IgniterStorageAdapterFactoryMap>,
  ): IgniterStorageBuilder<TScopes> {
    return new IgniterStorageBuilder({
      ...this.state,
      adapterFactories: {
        ...this.state.adapterFactories,
        ...factories,
      },
    })
  }

  /**
   * Uses a fully built adapter instance.
   */
  withAdapter(adapter: IgniterStorageAdapter): IgniterStorageBuilder<TScopes>

  /**
   * Uses a known adapter key + credentials (type-safe).
   */
  withAdapter<K extends IgniterStorageAdapterKey>(
    key: K,
    credentials: IgniterStorageAdapterCredentialsMap[K],
  ): IgniterStorageBuilder<TScopes>

  withAdapter(
    adapterOrKey: IgniterStorageAdapter | IgniterStorageAdapterKey,
    credentials?: IgniterStorageS3Credentials | IgniterStorageGoogleCredentials,
  ): IgniterStorageBuilder<TScopes> {
    if (adapterOrKey instanceof IgniterStorageAdapter) {
      return new IgniterStorageBuilder({
        ...this.state,
        adapter: adapterOrKey,
        adapterKey: undefined,
        adapterCredentials: undefined,
      })
    }

    return new IgniterStorageBuilder({
      ...this.state,
      adapterKey: adapterOrKey,
      adapterCredentials: credentials as any,
    })
  }

  /**
   * Sets a public base URL (CDN).
   * Falls back to `IGNITER_STORAGE_URL`.
   */
  withUrl(url: string): IgniterStorageBuilder<TScopes> {
    return new IgniterStorageBuilder({
      ...this.state,
      baseUrl: url,
    })
  }

  /**
   * Sets the base path prefix.
   * Falls back to `IGNITER_STORAGE_BASE_PATH`.
   */
  withPath(basePath: string): IgniterStorageBuilder<TScopes> {
    return new IgniterStorageBuilder({
      ...this.state,
      basePath,
    })
  }

  withLogger(logger: IgniterLogger): IgniterStorageBuilder<TScopes> {
    return new IgniterStorageBuilder({
      ...this.state,
      logger,
    })
  }

  withMaxFileSize(maxFileSize: number): IgniterStorageBuilder<TScopes> {
    return new IgniterStorageBuilder({
      ...this.state,
      policies: {
        ...this.state.policies,
        maxFileSize,
      },
    })
  }

  withAllowedMimeTypes(
    allowedMimeTypes: readonly string[],
  ): IgniterStorageBuilder<TScopes> {
    return new IgniterStorageBuilder({
      ...this.state,
      policies: {
        ...this.state.policies,
        allowedMimeTypes,
      },
    })
  }

  withAllowedExtensions(
    allowedExtensions: readonly string[],
  ): IgniterStorageBuilder<TScopes> {
    return new IgniterStorageBuilder({
      ...this.state,
      policies: {
        ...this.state.policies,
        allowedExtensions,
      },
    })
  }

  onUploadStarted(hook: NonNullable<IgniterStorageHooks['onUploadStarted']>) {
    return this.withHooks({ onUploadStarted: hook })
  }

  onUploadSuccess(hook: NonNullable<IgniterStorageHooks['onUploadSuccess']>) {
    return this.withHooks({ onUploadSuccess: hook })
  }

  onUploadError(hook: NonNullable<IgniterStorageHooks['onUploadError']>) {
    return this.withHooks({ onUploadError: hook })
  }

  onDeleteStarted(hook: NonNullable<IgniterStorageHooks['onDeleteStarted']>) {
    return this.withHooks({ onDeleteStarted: hook })
  }

  onDeleteSuccess(hook: NonNullable<IgniterStorageHooks['onDeleteSuccess']>) {
    return this.withHooks({ onDeleteSuccess: hook })
  }

  onDeleteError(hook: NonNullable<IgniterStorageHooks['onDeleteError']>) {
    return this.withHooks({ onDeleteError: hook })
  }

  onCopyStarted(hook: NonNullable<IgniterStorageHooks['onCopyStarted']>) {
    return this.withHooks({ onCopyStarted: hook })
  }

  onCopySuccess(hook: NonNullable<IgniterStorageHooks['onCopySuccess']>) {
    return this.withHooks({ onCopySuccess: hook })
  }

  onCopyError(hook: NonNullable<IgniterStorageHooks['onCopyError']>) {
    return this.withHooks({ onCopyError: hook })
  }

  onMoveStarted(hook: NonNullable<IgniterStorageHooks['onMoveStarted']>) {
    return this.withHooks({ onMoveStarted: hook })
  }

  onMoveSuccess(hook: NonNullable<IgniterStorageHooks['onMoveSuccess']>) {
    return this.withHooks({ onMoveSuccess: hook })
  }

  onMoveError(hook: NonNullable<IgniterStorageHooks['onMoveError']>) {
    return this.withHooks({ onMoveError: hook })
  }

  private withHooks(
    next: Partial<IgniterStorageHooks>,
  ): IgniterStorageBuilder<TScopes> {
    return new IgniterStorageBuilder({
      ...this.state,
      hooks: {
        ...this.state.hooks,
        ...next,
      },
    })
  }

  /**
   * Adds a scope template.
   *
   * Example:
   * - `addScope('user', '/user/[identifier]')`
   */
  addScope<
    K extends string,
    P extends string | undefined,
    Path extends string = P extends string ? P : DefaultScopePath<K>,
    NextScopes extends IgniterStorageScopes = AddScopeResult<TScopes, K, Path>,
  >(key: K, path?: P): IgniterStorageBuilder<NextScopes> {
    const resolvedPath = (path ?? (`/${key}` as DefaultScopePath<K>)) as Path

    const requiresIdentifier =
      resolvedPath.includes('[identifier]') as ContainsIdentifier<Path>

    return new IgniterStorageBuilder({
      ...(this.state as any),
      scopes: {
        ...this.state.scopes,
        [key]: {
          path: resolvedPath,
          requiresIdentifier,
        },
      },
    })
  }

  /**
   * Builds an `IgniterStorage` instance.
   */
  build(): IgniterStorage<TScopes> {
    const env = readIgniterStorageEnv()

    const baseUrl = this.state.baseUrl ?? env.url
    if (!baseUrl) {
      throw new IgniterStorageError({
        code: 'IGNITER_STORAGE_ADAPTER_NOT_CONFIGURED',
        operation: 'upload',
        message: 'IGNITER_STORAGE_URL is required (or call builder.withUrl()).',
      })
    }

    const basePath = this.state.basePath ?? env.basePath

    const policies: IgniterStoragePolicies | undefined = {
      ...env.policies,
      ...this.state.policies,
    }

    const adapter = this.resolveAdapterFromStateOrEnv(env)

    const core = new IgniterStorageCore({
      adapter,
      baseUrl,
      basePath,
      logger: this.state.logger,
      hooks: this.state.hooks,
      policies,
    })

    return new IgniterStorage<TScopes>({
      core,
      scopes: this.state.scopes,
    })
  }

  private resolveAdapterFromStateOrEnv(
    env: ReturnType<typeof readIgniterStorageEnv>,
  ): IgniterStorageAdapter {
    if (this.state.adapter) {
      return this.state.adapter
    }

    const key =
      this.state.adapterKey ??
      (env.adapter as IgniterStorageAdapterKey | undefined)
    if (!key) {
      throw new IgniterStorageError({
        code: 'IGNITER_STORAGE_ADAPTER_NOT_CONFIGURED',
        operation: 'upload',
        message:
          'IGNITER_STORAGE_ADAPTER is required (or call builder.withAdapter()).',
      })
    }

    const factory = this.state.adapterFactories?.[key]
    if (!factory) {
      throw new IgniterStorageError({
        code: 'IGNITER_STORAGE_ADAPTER_NOT_CONFIGURED',
        operation: 'upload',
        message: `Adapter factory for "${key}" not provided. Import one from @igniter-js/storage/adapters and pass it via withAdapterFactories().`,
        data: { key },
      })
    }

    if (key === 's3') {
      const c =
        (this.state.adapterCredentials as
          | IgniterStorageS3Credentials
          | undefined) ??
        env.s3 ??
        {}
      return factory(c)
    }

    const c =
      (this.state.adapterCredentials as
        | IgniterStorageGoogleCredentials
        | undefined) ??
      env.google ??
      {}
    return factory(c)
  }
}
