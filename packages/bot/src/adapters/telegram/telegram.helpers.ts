import type { BotCommandContent, BotTextContent } from '../../types/bot.types'

export const getServiceURL = (token: string, url?: string) =>
  `https://api.telegram.org/bot${token}${url}`

/**
 * Escapes special MarkdownV2 characters according to Telegram specification.
 * Reference: https://core.telegram.org/bots/api#markdownv2-style
 *
 * Rationale:
 * Telegram's MarkdownV2 requires escaping a broad set of punctuation characters.
 * Failing to escape correctly can break message formatting or drop content.
 *
 * Implementation notes:
 *  - Regex groups every escapable character and prefixes with a backslash.
 *  - Keep this helper idempotent for already-escaped text (Telegram tolerates double slashes,
 *    but we avoid attempting to detect previously escaped segments for performance).
 *
 * @param text Raw user or system generated text.
 * @returns Safe string ready for Telegram MarkdownV2.
 */
export function escapeMarkdownV2(text: string): string {
  if (!text) return ''
  return text.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1')
}

/**
 * Parses raw Telegram message text and classifies it as either:
 *  - Command ("/command arg1 arg2") -> BotCommandContent
 *  - Plain text -> BotTextContent
 *
 * Rules:
 *  - A command starts with a "/" at the first character (Telegram style).
 *  - Splits command + arguments by spaces; command name excludes leading slash.
 *  - Returns undefined if the text is empty or falsy.
 *
 * @param text Raw message text from Telegram update.
 * @returns Structured BotCommandContent | BotTextContent | undefined
 */
export function parseTelegramMessageContent(
  text: string,
): BotTextContent | BotCommandContent | undefined {
  if (!text) return undefined
  if (text.startsWith('/')) {
    const [commandWithSlash, ...args] = text.trim().split(' ')
    const command = commandWithSlash.slice(1)
    return {
      type: 'command',
      command,
      params: args,
      raw: text,
    }
  }
  return {
    type: 'text',
    content: text,
    raw: text,
  }
}

/**
 * Naive MIME type guess based on file extension.
 * Used only as a fallback when Telegram does not provide a definitive content-type.
 *
 * @param fileName The filename (with extension) to inspect.
 * @returns Best-effort MIME type string.
 */
export function guessMimeType(fileName: string): string {
  if (!fileName) return 'application/octet-stream'
  const ext = fileName.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'gif':
      return 'image/gif'
    case 'webp':
      return 'image/webp'
    case 'bmp':
      return 'image/bmp'
    case 'svg':
      return 'image/svg+xml'
    default:
      return 'application/octet-stream'
  }
}

/**
 * Downloads a Telegram file (by file_id) and returns a structured object
 * containing a File instance plus base64 representation and resolved metadata.
 *
 * Workflow:
 *  1. Call getFile to resolve the file path.
 *  2. Download binary content from Telegram file URL.
 *  3. Infer or override MIME type (optionally forcing JPEG for photos).
 *  4. Construct a File object (falls back gracefully in environments without full File support).
 *
 * @param fileId Telegram file_id.
 * @param token Bot token for authenticated API calls.
 * @param fileName Optional explicit filename override.
 * @param mimeType Optional explicit MIME type override.
 * @param forceJpeg Forces output MIME type to image/jpeg (used for uniform photo handling).
 * @throws Error if network calls fail or Telegram responds with non-ok status.
 * @returns Object with File, base64 encoded data, mimeType and resolved fileName.
 */
export async function fetchTelegramFileAsFile(
  fileId: string,
  token: string,
  fileName?: string,
  mimeType?: string,
  forceJpeg = false,
) {
  const res = await fetch(getServiceURL(token, `/getFile?file_id=${fileId}`))
  const data = await res.json()
  if (!res.ok || !data.ok) throw new Error('Failed to get Telegram file path')
  const filePath = data.result.file_path
  const fileUrl = `https://api.telegram.org/file/bot${token}/${filePath}`
  const fileRes = await fetch(fileUrl)
  if (!fileRes.ok) throw new Error('Failed to download Telegram file')
  const arrayBuffer = await fileRes.arrayBuffer()
  const name = fileName || filePath.split('/').pop() || 'file'
  let type = mimeType || fileRes.headers.get('content-type') || ''
  if (forceJpeg) {
    type = 'image/jpeg'
  } else if (!type || type === 'application/octet-stream') {
    type = guessMimeType(name)
  }

  const file = new File([arrayBuffer], name, { type })
  return {
    file,
    base64: Buffer.from(arrayBuffer).toString('base64'),
    mimeType: type,
    fileName: name,
  }
}
