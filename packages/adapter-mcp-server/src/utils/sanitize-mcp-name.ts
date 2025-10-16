/**
 * Sanitize identifiers to meet MCP name requirements: [a-z0-9_-]
 * - Replace any invalid(eg: .) character with `_`
 */
export function sanitizeMcpName(name: string): string {
  return name
    .replace('.', '_');
}

