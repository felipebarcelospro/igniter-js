import { IgniterStorageError } from '../errors/igniter-storage.error'

/**
 * Ensures a base URL ends with a trailing slash.
 */
export function ensureTrailingSlash(url: string): string {
  return url.endsWith('/') ? url : `${url}/`
}

/**
 * If `input` is an absolute URL with the same hostname as `baseUrl`, strip the baseUrl
 * and return the relative path (without leading slash).
 *
 * If hostname differs, throws a typed error.
 */
export function stripBaseUrlOrThrow(params: {
  input: string
  baseUrl: string
}): string {
  const { input, baseUrl } = params

  let parsed: URL
  try {
    parsed = new URL(input)
  } catch {
    return input.replace(/^\/+/, '')
  }

  const base = new URL(baseUrl)

  if (parsed.hostname !== base.hostname) {
    throw new IgniterStorageError({
      code: 'IGNITER_STORAGE_INVALID_PATH_HOST',
      operation: 'path',
      message:
        'The provided path is an URL with a different hostname than the configured baseUrl.',
      data: {
        input,
        baseUrl,
        inputHost: parsed.hostname,
        baseHost: base.hostname,
      },
    })
  }

  const basePathname = base.pathname.replace(/\/+$/g, '')
  const inputPathname = parsed.pathname

  const relative = basePathname
    ? inputPathname.replace(new RegExp(`^${escapeRegExp(basePathname)}`), '')
    : inputPathname

  return relative.replace(/^\/+/, '')
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
