/**
 * Upload policies enforced by `IgniterStorageCore`.
 */
export type IgniterStoragePolicies = {
  /** Maximum allowed size in bytes (only enforced when size is known). */
  maxFileSize?: number

  /** Allowed MIME types (e.g. ['image/png','image/jpeg']). */
  allowedMimeTypes?: readonly string[]

  /** Allowed extensions without dot (e.g. ['png','jpg']). */
  allowedExtensions?: readonly string[]
}

export type IgniterStoragePolicyViolation = {
  reason:
    | 'MAX_FILE_SIZE_EXCEEDED'
    | 'MIME_TYPE_NOT_ALLOWED'
    | 'EXTENSION_NOT_ALLOWED'
  message: string
  data?: unknown
}
