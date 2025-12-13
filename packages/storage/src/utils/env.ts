import type { IgniterStoragePolicies } from '../types/policies'

export type IgniterStorageEnvConfig = {
  adapter?: string
  url?: string
  basePath?: string

  policies?: IgniterStoragePolicies

  s3?: {
    endpoint?: string
    region?: string
    bucket?: string
    accessKeyId?: string
    secretAccessKey?: string
    signatureVersion?: string
  }

  google?: {
    bucket?: string
    endpoint?: string
    region?: string
    credentialsJson?: string
    credentialsJsonBase64?: string
  }
}

/**
 * Reads configuration from environment variables.
 *
 * All variables use the `IGNITER_STORAGE_` prefix.
 */
export function readIgniterStorageEnv(
  env: NodeJS.ProcessEnv = process.env,
): IgniterStorageEnvConfig {
  const maxFileSizeRaw = env.IGNITER_STORAGE_MAX_FILE_SIZE
  const maxFileSize = maxFileSizeRaw ? Number(maxFileSizeRaw) : undefined

  const allowedMimeTypes = env.IGNITER_STORAGE_ALLOWED_MIME_TYPES
    ? env.IGNITER_STORAGE_ALLOWED_MIME_TYPES.split(',').map((s) => s.trim()).filter(Boolean)
    : undefined

  const allowedExtensions = env.IGNITER_STORAGE_ALLOWED_EXTENSIONS
    ? env.IGNITER_STORAGE_ALLOWED_EXTENSIONS.split(',').map((s) => s.trim().replace(/^\./, '')).filter(Boolean)
    : undefined

  return {
    adapter: env.IGNITER_STORAGE_ADAPTER,
    url: env.IGNITER_STORAGE_URL,
    basePath: env.IGNITER_STORAGE_BASE_PATH,
    policies: {
      maxFileSize: Number.isFinite(maxFileSize) ? maxFileSize : undefined,
      allowedMimeTypes,
      allowedExtensions,
    },
    s3: {
      endpoint: env.IGNITER_STORAGE_S3_ENDPOINT ?? env.IGNITER_STORAGE_ENDPOINT,
      region: env.IGNITER_STORAGE_S3_REGION ?? env.IGNITER_STORAGE_REGION,
      bucket: env.IGNITER_STORAGE_S3_BUCKET ?? env.IGNITER_STORAGE_BUCKET,
      accessKeyId:
        env.IGNITER_STORAGE_S3_ACCESS_KEY_ID ?? env.IGNITER_STORAGE_ACCESS_KEY_ID,
      secretAccessKey:
        env.IGNITER_STORAGE_S3_SECRET_ACCESS_KEY ??
        env.IGNITER_STORAGE_SECRET_ACCESS_KEY,
      signatureVersion:
        env.IGNITER_STORAGE_S3_SIGNATURE_VERSION ?? env.IGNITER_STORAGE_SIGNATURE_VERSION,
    },
    google: {
      bucket: env.IGNITER_STORAGE_GOOGLE_BUCKET ?? env.IGNITER_STORAGE_BUCKET,
      endpoint: env.IGNITER_STORAGE_GOOGLE_ENDPOINT ?? env.IGNITER_STORAGE_ENDPOINT,
      region: env.IGNITER_STORAGE_GOOGLE_REGION ?? env.IGNITER_STORAGE_REGION,
      credentialsJson: env.IGNITER_STORAGE_GOOGLE_CREDENTIALS_JSON,
      credentialsJsonBase64: env.IGNITER_STORAGE_GOOGLE_CREDENTIALS_JSON_BASE64,
    },
  }
}
