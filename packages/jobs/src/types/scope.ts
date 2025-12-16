/**
 * Options for defining a scope used to isolate jobs (single scope supported by spec).
 */
export interface IgniterJobsScopeOptions {
  /** Whether the scope is mandatory when dispatching jobs. */
  required?: boolean
  /** Optional human-friendly description. */
  description?: string
}

/**
 * Represents a single scope entry.
 *
 * @example
 * ```typescript
 * const scope: IgniterJobsScopeEntry<'organization'> = {
 *   type: 'organization',
 *   id: 'org_123',
 *   tags: { plan: 'pro' },
 * }
 * ```
 */
export interface IgniterJobsScopeEntry<TScope extends string = string> {
  /** Scope type (e.g., organization, workspace). */
  type: TScope
  /** Scope identifier (string or number). */
  id: string | number
  /** Optional tags for telemetry or auditing. */
  tags?: Record<string, unknown>
}

/**
 * Registry type for scope definition.
 */
export type IgniterJobsScopeDefinition<TScope extends string = string> = Record<
  TScope,
  IgniterJobsScopeOptions
>