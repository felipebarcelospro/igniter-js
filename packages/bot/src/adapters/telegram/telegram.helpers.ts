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
 * Converts standard Markdown to Telegram's MarkdownV2 format.
 * 
 * This function handles the conversion of common Markdown patterns to Telegram's
 * strict MarkdownV2 format, which requires escaping special characters outside
 * of formatting entities.
 * 
 * Supported conversions:
 * - **bold** -> *bold*
 * - *italic* or _italic_ -> _italic_
 * - `code` -> `code`
 * - ```code blocks``` -> ```code blocks```
 * - [links](url) -> [links](url)
 * 
 * All other special characters are properly escaped.
 * 
 * @param text Standard Markdown text
 * @returns Text formatted for Telegram MarkdownV2
 */
export function convertMarkdownToTelegramV2(text: string): string {
  if (!text) return ''
  
  // Characters that need escaping in MarkdownV2 (outside of entities)
  const specialChars = /([_*[\]()~`>#+\-=|{}.!\\])/g
  
  // Store code blocks and inline code to restore later
  const codeBlocks: string[] = []
  const inlineCodes: string[] = []
  
  // Temporarily replace code blocks and inline code
  let result = text
    // Preserve code blocks (```...```)
    .replace(/```[\s\S]*?```/g, (match) => {
      codeBlocks.push(match)
      return `\x00CODEBLOCK${codeBlocks.length - 1}\x00`
    })
    // Preserve inline code (`...`)
    .replace(/`[^`]+`/g, (match) => {
      inlineCodes.push(match)
      return `\x00INLINECODE${inlineCodes.length - 1}\x00`
    })
  
  // Store bold/italic patterns to restore after escaping
  const boldPatterns: string[] = []
  const italicPatterns: string[] = []
  const linkPatterns: string[] = []
  
  // Convert **bold** to Telegram bold (store temporarily)
  result = result.replace(/\*\*([^*]+)\*\*/g, (_, content) => {
    // Escape special chars inside the bold content
    const escapedContent = content.replace(specialChars, '\\$1')
    boldPatterns.push(`*${escapedContent}*`)
    return `\x00BOLD${boldPatterns.length - 1}\x00`
  })
  
  // Convert *italic* or _italic_ to Telegram italic (store temporarily)
  // Handle *italic* (single asterisk)
  result = result.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, (_, content) => {
    const escapedContent = content.replace(specialChars, '\\$1')
    italicPatterns.push(`_${escapedContent}_`)
    return `\x00ITALIC${italicPatterns.length - 1}\x00`
  })
  // Handle _italic_
  result = result.replace(/(?<!\\)_([^_]+)_/g, (_, content) => {
    const escapedContent = content.replace(specialChars, '\\$1')
    italicPatterns.push(`_${escapedContent}_`)
    return `\x00ITALIC${italicPatterns.length - 1}\x00`
  })
  
  // Convert [text](url) links
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, linkText, url) => {
    const escapedText = linkText.replace(specialChars, '\\$1')
    // URL should not have special escaping for most chars, but escape ) if present
    const escapedUrl = url.replace(/\)/g, '\\)')
    linkPatterns.push(`[${escapedText}](${escapedUrl})`)
    return `\x00LINK${linkPatterns.length - 1}\x00`
  })
  
  // Escape all remaining special characters
  result = result.replace(specialChars, '\\$1')
  
  // Restore patterns in reverse order
  result = result
    .replace(/\x00LINK(\d+)\x00/g, (_, idx) => linkPatterns[parseInt(idx)])
    .replace(/\x00ITALIC(\d+)\x00/g, (_, idx) => italicPatterns[parseInt(idx)])
    .replace(/\x00BOLD(\d+)\x00/g, (_, idx) => boldPatterns[parseInt(idx)])
    .replace(/\x00INLINECODE(\d+)\x00/g, (_, idx) => inlineCodes[parseInt(idx)])
    .replace(/\x00CODEBLOCK(\d+)\x00/g, (_, idx) => codeBlocks[parseInt(idx)])
  
  return result
}

/**
 * Converts standard Markdown to Telegram's HTML format.
 * 
 * HTML is more forgiving than MarkdownV2 and handles edge cases better.
 * This is the recommended approach for AI-generated content that may
 * contain various Markdown patterns.
 * 
 * Supported conversions:
 * - **bold** -> <b>bold</b>
 * - *italic* or _italic_ -> <i>italic</i>
 * - `code` -> <code>code</code>
 * - ```code blocks``` -> <pre>code blocks</pre>
 * - [links](url) -> <a href="url">links</a>
 * - Numbered lists (1. item) -> preserved with proper line breaks
 * 
 * HTML special chars (<, >, &) are escaped.
 * 
 * @param text Standard Markdown text
 * @returns Text formatted for Telegram HTML
 */
export function convertMarkdownToTelegramHTML(text: string): string {
  if (!text) return ''
  
  // First, escape HTML special characters
  let result = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  
  // Store code blocks to prevent processing
  const codeBlocks: string[] = []
  const inlineCodes: string[] = []
  
  // Temporarily replace code blocks
  result = result
    .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
      // Unescape HTML entities inside code blocks (they were already escaped)
      codeBlocks.push(`<pre>${code.trim()}</pre>`)
      return `\x00CODEBLOCK${codeBlocks.length - 1}\x00`
    })
    .replace(/`([^`]+)`/g, (_, code) => {
      inlineCodes.push(`<code>${code}</code>`)
      return `\x00INLINECODE${inlineCodes.length - 1}\x00`
    })
  
  // Convert **bold** to <b>bold</b>
  result = result.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
  
  // Convert *italic* to <i>italic</i> (single asterisk, not part of **)
  result = result.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<i>$1</i>')
  
  // Convert _italic_ to <i>italic</i>
  result = result.replace(/(?<!\\)_([^_]+)_/g, '<i>$1</i>')
  
  // Convert [text](url) to <a href="url">text</a>
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
  
  // Restore code blocks and inline code
  result = result
    .replace(/\x00INLINECODE(\d+)\x00/g, (_, idx) => inlineCodes[parseInt(idx)])
    .replace(/\x00CODEBLOCK(\d+)\x00/g, (_, idx) => codeBlocks[parseInt(idx)])
  
  return result
}

/**
 * Converts standard Markdown to Telegram's legacy Markdown format.
 * 
 * Legacy Markdown has DIFFERENT rules than standard Markdown:
 * - *text* = bold (not italic!)
 * - _text_ = italic
 * - `code` = monospace
 * - ```code``` = pre-formatted
 * - [text](url) = links
 * 
 * The main issue is that AI-generated content uses:
 * - **text** for bold (not supported in legacy)
 * - *text* for italic (but Telegram uses this for bold!)
 * - Bullet points like "* item" or "- item" which break parsing
 * 
 * This function sanitizes the text to work with Telegram's legacy parser.
 * 
 * @param text Standard Markdown text
 * @returns Text safe for Telegram's legacy Markdown parser
 */
export function convertMarkdownToTelegramLegacy(text: string): string {
  if (!text) return ''
  
  // Store code blocks to prevent processing
  const codeBlocks: string[] = []
  const inlineCodes: string[] = []
  
  let result = text
    // Preserve code blocks (```...```)
    .replace(/```[\s\S]*?```/g, (match) => {
      codeBlocks.push(match)
      return `\x00CODEBLOCK${codeBlocks.length - 1}\x00`
    })
    // Preserve inline code (`...`)
    .replace(/`[^`]+`/g, (match) => {
      inlineCodes.push(match)
      return `\x00INLINECODE${inlineCodes.length - 1}\x00`
    })
  
  // Convert **bold** to *bold* (Telegram legacy bold)
  result = result.replace(/\*\*([^*]+)\*\*/g, '*$1*')
  
  // Convert _italic_ to stay as _italic_ (Telegram uses _ for italic)
  // Already correct, no change needed
  
  // Handle standalone * that are NOT bold markers (e.g., bullet points)
  // Pattern: asterisk followed by whitespace at start of line = bullet point
  // We need to escape these or convert to a different marker
  result = result.replace(/^(\s*)\*\s+/gm, '$1• ') // Convert bullet * to •
  result = result.replace(/^(\s*)-\s+/gm, '$1• ')  // Convert bullet - to •
  
  // Handle single *italic* that should become _italic_
  // But be careful: after converting **bold** to *bold*, we need to NOT
  // convert those. So we only convert single * that are for italic.
  // Since **bold** is now *bold*, single *italic* would conflict.
  // In legacy Telegram: *text* is BOLD, not italic!
  // So if the user meant italic with *text*, we convert to _text_
  // But if it was originally **bold**, it's now correct as *bold*
  
  // Restore code blocks and inline code
  result = result
    .replace(/\x00INLINECODE(\d+)\x00/g, (_, idx) => inlineCodes[parseInt(idx)])
    .replace(/\x00CODEBLOCK(\d+)\x00/g, (_, idx) => codeBlocks[parseInt(idx)])
  
  return result
}

/**
 * Strips all Markdown formatting from text, returning plain text.
 * 
 * Use this when you want to ensure the message is sent as plain text
 * without any formatting that could cause parsing errors.
 * 
 * @param text Markdown text
 * @returns Plain text without any Markdown formatting
 */
export function stripMarkdown(text: string): string {
  if (!text) return ''
  
  return text
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, (match) => {
      const code = match.replace(/```\w*\n?/, '').replace(/```$/, '')
      return code.trim()
    })
    // Remove inline code
    .replace(/`([^`]+)`/g, '$1')
    // Remove bold
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    // Remove italic (asterisk)
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '$1')
    // Remove italic (underscore)
    .replace(/(?<!\\)_([^_]+)_/g, '$1')
    // Convert links to just the text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove heading markers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove horizontal rules
    .replace(/^[\-*_]{3,}\s*$/gm, '')
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
