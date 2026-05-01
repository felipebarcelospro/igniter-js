/**
 * @fileoverview Path utilities for @igniter-js/collections
 * @module @igniter-js/collections/utils/path
 */

import { dirname, join, parse, relative, resolve } from "node:path";

/**
 * Static utility class for path operations.
 *
 * Handles path templating, resolution, and ID extraction from filenames.
 *
 * @example Template substitution
 * ```typescript
 * const path = IgniterCollectionPath.template(
 *   '{id}.mdx',
 *   { id: 'my-post' }
 * );
 * // Result: "my-post.mdx"
 * ```
 *
 * @example Extracting ID from filename
 * ```typescript
 * const id = IgniterCollectionPath.extractId(
 *   '{id}.mdx',
 *   'my-post.mdx'
 * );
 * // Result: "my-post"
 * ```
 */
export class IgniterCollectionPath {
  private constructor() {}

  /**
   * Resolve path segments into an absolute path.
   *
   * @param basePath - Base directory path
   * @param segments - Additional path segments
   * @returns Resolved absolute path
   */
  static resolve(basePath: string, ...segments: string[]): string {
    return resolve(basePath, ...segments);
  }

  /**
   * Join path segments.
   *
   * @param segments - Path segments to join
   * @returns Joined path
   */
  static join(...segments: string[]): string {
    return join(...segments);
  }

  /**
   * Get relative path from base.
   *
   * @param from - Base path
   * @param to - Target path
   * @returns Relative path
   */
  static relative(from: string, to: string): string {
    return relative(from, to);
  }

  /**
   * Get the directory name of a path.
   *
   * @param filePath - Full file path
   * @returns Directory path
   */
  static dirname(filePath: string): string {
    return dirname(filePath);
  }

  /**
   * Apply template substitution to a pattern.
   *
   * Replaces placeholders like {id}, {parent_id} with values.
   *
   * @param pattern - Pattern with placeholders
   * @param variables - Variable values to substitute
   * @returns Pattern with substituted values
   */
  static template(pattern: string, variables: Record<string, string>): string {
    let result = pattern;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
    }
    return result;
  }

  /**
   * Extract variable values from a path based on a pattern.
   *
   * @param pattern - Pattern with placeholders like {id}, {agent}, {skill}
   * @param filePath - Actual path to extract from (can be full path or relative)
   * @returns Record of extracted variables or null if no match
   *
   * @example
   * ```typescript
   * IgniterCollectionPath.extract('{id}.mdx', 'my-post.mdx') // { id: 'my-post' }
   * IgniterCollectionPath.extract('agents/{agent}/{id}.md', 'agents/lia/123.md') // { agent: 'lia', id: '123' }
   * ```
   */
  static extract(pattern: string, filePath: string): Record<string, string> | null {
    const variables = this.extractVariables(pattern);
    if (variables.length === 0) {
      return pattern === filePath ? {} : null;
    }

    // Convert pattern to regex
    // {id} -> ([^/]+) for capturing segments between slashes
    const regexPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, "\\$&") // Escape regex chars
      .replace(/\\\{[^}]+\\\}/g, "([^/]+)"); // Replace escaped {var} with capture group

    // Match from the end of the path to handle relative/absolute path differences
    // or ensure the pattern matches the tail of the path
    const regex = new RegExp(`${regexPattern}$`);
    const match = filePath.match(regex);

    if (!match) {
      return null;
    }

    const result: Record<string, string> = {};
    variables.forEach((name, index) => {
      result[name] = match[index + 1];
    });

    return result;
  }

  /**
   * Extract variable values from a filename based on a pattern.
   * @deprecated Use extract() instead for better path support
   *
   * @param pattern - Pattern with placeholders like {id}
   * @param filename - Actual filename to extract from
   * @returns Extracted ID or null if no match
   */
  static extractId(pattern: string, filename: string): string | null {
    const extracted = this.extract(pattern, filename);
    if (!extracted) return null;
    return extracted.id || Object.values(extracted)[0];
  }

  /**
   * Extract all variables from a pattern.
   *
   * @param pattern - Pattern with placeholders
   * @returns Array of variable names
   */
  static extractVariables(pattern: string): string[] {
    const matches = pattern.match(/\{([^}]+)\}/g);
    if (!matches) return [];
    return matches.map((m) => m.slice(1, -1));
  }

  /**
   * Get the directory and filename from a path.
   *
   * @param filePath - Full file path
   * @returns Parsed path object with dir, name, ext
   */
  static parse(filePath: string): { dir: string; name: string; ext: string } {
    const parsed = parse(filePath);
    return {
      dir: parsed.dir,
      name: parsed.name,
      ext: parsed.ext,
    };
  }

  /**
   * Check if a filename matches a pattern.
   *
   * @param pattern - Pattern with placeholders
   * @param filename - Filename to check
   * @returns True if matches
   */
  static matches(pattern: string, filename: string): boolean {
    return IgniterCollectionPath.extractId(pattern, filename) !== null;
  }
}
