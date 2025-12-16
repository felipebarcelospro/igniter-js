/**
 * @fileoverview Scope utilities for @igniter-js/jobs
 * @module @igniter-js/jobs/utils/scope.utils
 */

import type { IgniterJobsScopeEntry } from "../types/scope";

/**
 * Static utility class for handling job scopes and metadata.
 */
export class IgniterJobsScopeUtils {
  /**
   * The key used to store scope information in job metadata.
   */
  public static readonly SCOPE_METADATA_KEY = "__igniter_jobs_scope";

  /**
   * Merges a scope entry into a metadata object.
   *
   * @param metadata - Existing metadata object.
   * @param scope - The scope entry to merge.
   * @returns A new metadata object containing the scope information, or the original metadata if no scope is provided.
   */
  public static mergeMetadataWithScope(
    metadata: Record<string, unknown> | undefined,
    scope: IgniterJobsScopeEntry | undefined,
  ): Record<string, unknown> | undefined {
    if (!scope) return metadata;
    return {
      ...(metadata ?? {}),
      [this.SCOPE_METADATA_KEY]: scope,
    };
  }

  /**
   * Extracts a scope entry from a metadata object.
   *
   * @param metadata - The metadata object to inspect.
   * @returns The extracted scope entry, or undefined if not found.
   */
  public static extractScopeFromMetadata(
    metadata: Record<string, unknown> | undefined,
  ): IgniterJobsScopeEntry | undefined {
    if (!metadata) return undefined;
    const value = (metadata as any)[this.SCOPE_METADATA_KEY];
    if (!value || typeof value !== "object") return undefined;
    if (!("type" in value) || !("id" in value)) return undefined;
    return value as IgniterJobsScopeEntry;
  }
}
