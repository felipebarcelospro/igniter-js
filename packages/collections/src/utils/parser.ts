/**
 * @fileoverview Content parsing utilities for @igniter-js/collections
 * @module @igniter-js/collections/utils/parser
 */

import matter from "gray-matter";

/**
 * Parsed content result.
 */
export interface IgniterCollectionParsedContent {
  /** Parsed structured data (frontmatter or JSON root) */
  data: Record<string, unknown>;
  /** Unstructured content body (empty for JSON) */
  content: string;
}

/**
 * Static utility class for content parsing operations.
 *
 * Automatically detects format based on file extension (JSON vs Markdown).
 * Uses gray-matter under the hood for parsing YAML frontmatter in Markdown files.
 *
 * @example Parsing a markdown file
 * \`\`\`typescript
 * const { data, content } = IgniterCollectionParser.parse(\`---
 * title: Hello World
 * draft: true
 * ---
 * 
 * # Hello World
 * 
 * This is the content.
 * \`, 'post.mdx');
 * 
 * console.log(data.title); // "Hello World"
 * console.log(content); // "# Hello World\\n\\nThis is the content."
 * \`\`\`
 */
export class IgniterCollectionParser {
  private constructor() { }

  /**
   * Parse content dynamically based on file path.
   * Supports JSON natively, and falls back to Markdown + Frontmatter.
   *
   * @param raw - Raw file string
   * @param path - Optional file path to infer format from extension
   * @returns Parsed data and content
   */
  static parse(raw: string, path?: string): IgniterCollectionParsedContent {
    if (path && path.endsWith('.json')) {
      return {
        data: JSON.parse(raw) as Record<string, unknown>,
        content: "",
      };
    }

    const result = matter(raw);
    return {
      data: result.data as Record<string, unknown>,
      content: result.content.trim(),
    };
  }

  /**
   * Serialize data and content into the appropriate format based on file path.
   *
   * @param data - Structured data object
   * @param content - Content body string
   * @param path - Optional file path to infer format from extension
   * @returns Serialized string (JSON or Markdown with Frontmatter)
   */
  static serialize(data: Record<string, unknown>, content: string = "", path?: string): string {
    if (path && path.endsWith('.json')) {
      return JSON.stringify(data, null, 2);
    }

    return matter.stringify(content, data);
  }

  /**
   * Check if content has frontmatter.
   *
   * @param raw - Raw content string
   * @returns True if frontmatter delimiter is present
   */
  static hasFrontmatter(raw: string): boolean {
    return raw.trimStart().startsWith("---");
  }

  /**
   * Extract only the metadata without parsing the text body.
   *
   * @param raw - Raw string
   * @param path - Optional file path
   * @returns Data object
   */
  static extractData(raw: string, path?: string): Record<string, unknown> {
    if (path && path.endsWith('.json')) {
      return JSON.parse(raw) as Record<string, unknown>;
    }
    return matter(raw).data as Record<string, unknown>;
  }
}
