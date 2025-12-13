import type { McpToolAnnotations } from "src/types";

/**
 * HTTP methods considered idempotent per HTTP specification.
 * - GET: Always idempotent (read-only)
 * - PUT: Idempotent (replace entire resource)
 * - DELETE: Idempotent (deleting twice has same effect)
 * 
 * Non-idempotent:
 * - POST: Creates new resource each time
 * - PATCH: May have different effects on repeated calls
 */
const IDEMPOTENT_METHODS = ['GET', 'PUT', 'DELETE'];

/**
 * HTTP methods that modify state (not read-only).
 */
const MUTATION_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH'];

/**
 * HTTP methods considered destructive (permanently removes data).
 */
const DESTRUCTIVE_METHODS = ['DELETE'];

/**
 * Infers MCP tool annotations from HTTP method and action metadata.
 * 
 * This function automatically generates appropriate annotations based on
 * HTTP semantics and REST conventions:
 * 
 * - `title`: Human-readable name from action name
 * - `readOnlyHint`: true for GET, false for mutations
 * - `destructiveHint`: true for DELETE, false otherwise
 * - `idempotentHint`: true for GET/PUT/DELETE, false for POST/PATCH
 * - `openWorldHint`: false (APIs are closed systems by default)
 * 
 * @param method - HTTP method (GET, POST, PUT, DELETE, PATCH)
 * @param actionName - Optional human-readable action name for title
 * @returns MCP tool annotations object
 * 
 * @example
 * ```typescript
 * inferToolAnnotations('GET', 'List Users');
 * // Returns:
 * // {
 * //   title: 'List Users',
 * //   readOnlyHint: true,
 * //   destructiveHint: false,
 * //   idempotentHint: true,
 * //   openWorldHint: false
 * // }
 * 
 * inferToolAnnotations('DELETE', 'Delete User');
 * // Returns:
 * // {
 * //   title: 'Delete User',
 * //   readOnlyHint: false,
 * //   destructiveHint: true,
 * //   idempotentHint: true,
 * //   openWorldHint: false
 * // }
 * ```
 */
export function inferToolAnnotations(
  method: string,
  actionName?: string
): McpToolAnnotations {
  const upperMethod = method.toUpperCase();
  
  // Determine hints based on HTTP method semantics
  const isReadOnly = !MUTATION_METHODS.includes(upperMethod);
  const isDestructive = DESTRUCTIVE_METHODS.includes(upperMethod);
  const isIdempotent = IDEMPOTENT_METHODS.includes(upperMethod);
  
  return {
    // Title from action name if provided
    ...(actionName && { title: actionName }),
    
    // Read-only: GET requests don't modify state
    readOnlyHint: isReadOnly,
    
    // Destructive: Only DELETE permanently removes data
    // Note: Only meaningful when readOnlyHint is false
    destructiveHint: isReadOnly ? false : isDestructive,
    
    // Idempotent: GET, PUT, DELETE are idempotent per HTTP spec
    // POST and PATCH are not idempotent
    idempotentHint: isIdempotent,
    
    // Open world: false by default since APIs are typically closed systems
    // This could be overridden for tools that interact with external services
    openWorldHint: false,
  };
}

/**
 * Determines if a tool should be marked as read-only based on HTTP method.
 */
export function isReadOnlyMethod(method: string): boolean {
  return !MUTATION_METHODS.includes(method.toUpperCase());
}

/**
 * Determines if a tool should be marked as destructive based on HTTP method.
 */
export function isDestructiveMethod(method: string): boolean {
  return DESTRUCTIVE_METHODS.includes(method.toUpperCase());
}

/**
 * Determines if a tool should be marked as idempotent based on HTTP method.
 */
export function isIdempotentMethod(method: string): boolean {
  return IDEMPOTENT_METHODS.includes(method.toUpperCase());
}
