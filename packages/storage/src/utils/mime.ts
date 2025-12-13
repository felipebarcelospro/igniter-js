import { extension as mimeExtension, lookup as mimeLookup } from 'mime-types'

/**
 * Infers a Content-Type from a filename.
 */
export function inferContentTypeFromFilename(filename: string): string | null {
  const guessed = mimeLookup(filename)
  return typeof guessed === 'string' && guessed ? guessed : null
}

/**
 * Infers an extension (without dot) from a Content-Type.
 */
export function inferExtensionFromContentType(contentType: string): string | null {
  const normalized = contentType.split(';')[0]?.trim()
  if (!normalized) {
    return null
  }

  const ext = mimeExtension(normalized)
  return typeof ext === 'string' && ext ? ext : null
}

/**
 * Normalizes Content-Type for comparison.
 */
export function normalizeContentType(contentType: string): string {
  return contentType.split(';')[0]?.trim().toLowerCase() || contentType
}
