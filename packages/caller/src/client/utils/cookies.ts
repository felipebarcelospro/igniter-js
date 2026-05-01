import type { IgniterCallerClientCookies } from '../interfaces/config'

export function buildCookieHeader(
  cookies?: IgniterCallerClientCookies,
): string | undefined {
  if (!cookies || Object.keys(cookies).length === 0) return undefined

  return Object.entries(cookies)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ')
}
