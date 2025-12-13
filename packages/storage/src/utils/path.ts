/**
 * Normalizes and joins URL/path-like segments.
 *
 * Rules:
 * - trims leading/trailing slashes per segment
 * - keeps output without leading slash
 * - removes empty segments
 */
export function joinPathSegments(
  ...segments: Array<string | null | undefined | false>
): string {
  const normalized = segments
    .flatMap((segment) => {
      if (!segment) {
        return []
      }

      const raw = String(segment)
      return raw
        .split('/')
        .map((part) => part.trim())
        .filter(Boolean)
    })
    .map((part) => part.replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)

  return normalized.join('/')
}

/**
 * Splits a path into `{ dir, base }`.
 */
export function splitPath(path: string): { dir: string; base: string } {
  const normalized = path.replace(/^\/+/, '')
  const idx = normalized.lastIndexOf('/')
  if (idx === -1) {
    return { dir: '', base: normalized }
  }

  return {
    dir: normalized.slice(0, idx),
    base: normalized.slice(idx + 1),
  }
}

/**
 * Extracts extension (without dot) from a basename.
 */
export function getExtension(basename: string): string {
  const last = basename.split('/').pop() || ''
  const idx = last.lastIndexOf('.')
  if (idx <= 0 || idx === last.length - 1) {
    return ''
  }

  return last.slice(idx + 1).toLowerCase()
}

/**
 * Extracts basename from a path.
 */
export function getBasename(path: string): string {
  const normalized = path.replace(/\/+$/g, '')
  return normalized.split('/').pop() || ''
}
