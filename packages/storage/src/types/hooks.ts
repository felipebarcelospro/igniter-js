import type { IgniterStorageFile } from './file'

export type IgniterStorageHookContext = {
  /** Operation that triggered the hook. */
  operation: 'upload' | 'delete' | 'copy' | 'move'

  /** Fully resolved object key (includes basePath/scope/path). */
  path: string
}

export type IgniterStorageUploadHookPayload = IgniterStorageHookContext & {
  source?: {
    kind: 'file' | 'url' | 'buffer' | 'base64'
    url?: string
  }

  /** Destination filename (might be inferred). */
  name: string

  /** Destination extension (might be inferred). */
  extension: string

  contentType: string
  size?: number
}

export type IgniterStorageUploadSuccessPayload = IgniterStorageUploadHookPayload & {
  file: IgniterStorageFile
}

export type IgniterStorageHooks = {
  onUploadStarted?: (payload: IgniterStorageUploadHookPayload) => void | Promise<void>
  onUploadSuccess?: (payload: IgniterStorageUploadSuccessPayload) => void | Promise<void>
  onUploadError?: (payload: IgniterStorageUploadHookPayload, error: Error) => void | Promise<void>

  onDeleteStarted?: (payload: IgniterStorageHookContext) => void | Promise<void>
  onDeleteSuccess?: (payload: IgniterStorageHookContext) => void | Promise<void>
  onDeleteError?: (payload: IgniterStorageHookContext, error: Error) => void | Promise<void>

  onCopyStarted?: (payload: IgniterStorageHookContext & { from: string; to: string }) => void | Promise<void>
  onCopySuccess?: (payload: IgniterStorageHookContext & { from: string; to: string }) => void | Promise<void>
  onCopyError?: (
    payload: IgniterStorageHookContext & { from: string; to: string },
    error: Error,
  ) => void | Promise<void>

  onMoveStarted?: (payload: IgniterStorageHookContext & { from: string; to: string }) => void | Promise<void>
  onMoveSuccess?: (payload: IgniterStorageHookContext & { from: string; to: string }) => void | Promise<void>
  onMoveError?: (
    payload: IgniterStorageHookContext & { from: string; to: string },
    error: Error,
  ) => void | Promise<void>
}
