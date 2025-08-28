import matter from 'gray-matter';
import { z } from 'zod';
import type { MemoryFrontmatter, MemoryItem, MemoryType, ValidationResult, TaskStatus, TaskPriority } from './types';

/** Zod schema for frontmatter validation. */
const FrontmatterSchema = z.object({
  id: z.string(),
  type: z.custom<MemoryType>(),
  category: z.string().optional(),
  confidence: z.number().min(0).max(1),
  created_at: z.preprocess((v) => (v instanceof Date ? v.toISOString() : v), z.string()),
  updated_at: z.preprocess((v) => (v instanceof Date ? v.toISOString() : v), z.string()),
  tags: z.array(z.string()).default([]),
  source: z.enum(['user_input', 'code_analysis', 'pattern_detection', 'reflection', 'tool_interaction']),
  project_root: z.string(),
  related_memories: z.array(z.string()).optional(),
  relationships: z.array(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
  sensitive: z.boolean().optional(),
  
  // Task Management Fields (for requirement/design/task/bug_report types)
  status: z.enum(['todo', 'in_progress', 'blocked', 'testing', 'done', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assignee: z.string().optional(),
  due_date: z.string().optional(),
  completed_at: z.string().optional(),
  
  // Hierarchy
  parent_id: z.string().optional(),
  feature_id: z.string().optional(),
  order: z.number().optional(),
  
  // Dependencies
  dependencies: z.array(z.string()).optional(),
  blocks: z.array(z.string()).optional(),
  
  // Sub-tasks
  subtasks: z.array(z.any()).optional(),
  
  // Development specific
  acceptance_criteria: z.array(z.string()).optional(),
  files_involved: z.array(z.string()).optional(),
  test_cases: z.array(z.string()).optional(),
  estimated_hours: z.number().optional(),
  actual_hours: z.number().optional(),
  
  // Enhanced delegation fields
  delegation_status: z.enum(['queued', 'running', 'completed', 'failed', 'cancelled']).optional(),
  delegation_started_at: z.string().optional(),
  delegation_completed_at: z.string().optional(),
  delegation_process_id: z.number().optional(),
  delegation_output_file: z.string().optional(),
  delegation_progress: z.string().optional(),
  delegation_error: z.string().optional(),
  delegation_attempts: z.number().optional(),
  delegation_timeout_minutes: z.number().optional(),
  
  // Legacy delegation fields
  delegated_to: z.string().optional(),
  delegated_at: z.string().optional(),
  delegation_config: z.record(z.any()).optional(),
});

/**
 * Parser responsible for reading MDX memory files and validating their structure.
 * Provides frontmatter extraction, content extraction and structural validation.
 */
export class MdxParser {
  /** Generates a slug-like ID from a title and type. */
  generateMemoryId(title: string, type: MemoryType): string {
    const typeSlug = getTypeSlug(type);
    const base = `${typeSlug}-${title}`
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
    return base || `${type}-${Date.now()}`;
  }

  /** Builds MDX string with YAML frontmatter and markdown body. */
  generateMdxContent(memory: MemoryItem): string {
    const fmRaw = {
      id: memory.frontmatter.id,
      type: memory.frontmatter.type,
      category: memory.frontmatter.category,
      confidence: memory.frontmatter.confidence,
      created_at: memory.frontmatter.created_at,
      updated_at: memory.frontmatter.updated_at,
      tags: memory.frontmatter.tags ?? [],
      source: memory.frontmatter.source,
      project_root: memory.frontmatter.project_root,
      related_memories: memory.frontmatter.related_memories,
      relationships: (memory.frontmatter.relationships ?? []).map((r) => cleanUndefined(r)),
      metadata: memory.frontmatter.metadata,
      sensitive: memory.frontmatter.sensitive,
      
      // Task management fields
      status: memory.frontmatter.status,
      priority: memory.frontmatter.priority,
      assignee: memory.frontmatter.assignee,
      due_date: memory.frontmatter.due_date,
      completed_at: memory.frontmatter.completed_at,
      parent_id: memory.frontmatter.parent_id,
      feature_id: memory.frontmatter.feature_id,
      order: memory.frontmatter.order,
      dependencies: memory.frontmatter.dependencies,
      blocks: memory.frontmatter.blocks,
      subtasks: memory.frontmatter.subtasks,
      acceptance_criteria: memory.frontmatter.acceptance_criteria,
      files_involved: memory.frontmatter.files_involved,
      test_cases: memory.frontmatter.test_cases,
      estimated_hours: memory.frontmatter.estimated_hours,
      actual_hours: memory.frontmatter.actual_hours,
      
      // Enhanced delegation fields
      delegation_status: memory.frontmatter.delegation_status,
      delegation_started_at: memory.frontmatter.delegation_started_at,
      delegation_completed_at: memory.frontmatter.delegation_completed_at,
      delegation_process_id: memory.frontmatter.delegation_process_id,
      delegation_output_file: memory.frontmatter.delegation_output_file,
      delegation_progress: memory.frontmatter.delegation_progress,
      delegation_error: memory.frontmatter.delegation_error,
      delegation_attempts: memory.frontmatter.delegation_attempts,
      delegation_timeout_minutes: memory.frontmatter.delegation_timeout_minutes,
      
      // Legacy delegation fields
      delegated_to: memory.frontmatter.delegated_to,
      delegated_at: memory.frontmatter.delegated_at,
      delegation_config: memory.frontmatter.delegation_config,
    } as Record<string, unknown>;
    const fm = cleanUndefined(fmRaw) as Record<string, unknown>;
    const yaml = matter.stringify(memory.content.trim() + '\n', fm);
    return yaml.trim() + '\n';
  }
  /** Parses a MDX file content string into a MemoryItem (without file persistence). */
  parseContent(content: string, filePath?: string): MemoryItem {
    const parsed = matter(content);
    const fm = FrontmatterSchema.parse(parsed.data) as MemoryFrontmatter;
    const title = this.extractTitleFromContent(parsed.content) || fm.id;
    return {
      id: fm.id,
      type: fm.type,
      title,
      content: parsed.content.trim(),
      frontmatter: fm,
      filePath,
    };
  }

  /** Extracts and validates the frontmatter from a MDX content string. */
  extractFrontmatter(content: string): MemoryFrontmatter {
    const parsed = matter(content);
    return FrontmatterSchema.parse(parsed.data) as MemoryFrontmatter;
  }

  /** Extracts the markdown body from a MDX content string. */
  extractMarkdownContent(content: string): string {
    const parsed = matter(content);
    return parsed.content.trim();
  }

  /** Validates a MemoryItem structure; returns errors, warnings and suggestions. */
  validateMemoryStructure(memory: MemoryItem): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    try {
      FrontmatterSchema.parse(memory.frontmatter);
    } catch (e: any) {
      errors.push(...(e?.issues?.map((i: any) => i.message) ?? ['invalid frontmatter']));
    }

    if (!memory.title?.trim()) {
      warnings.push('Missing title; using ID as title.');
    }

    if (!memory.frontmatter.tags || memory.frontmatter.tags.length === 0) {
      suggestions.push('Consider adding tags for better search.');
    }

    return { isValid: errors.length === 0, errors, warnings, suggestions };
  }

  private extractTitleFromContent(content: string): string | null {
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const m = /^#\s+(.+)$/.exec(line.trim());
      if (m) return m[1].trim();
    }
    return null;
  }
}

/** Factory for MdxParser. */
export function createMdxParser(): MdxParser {
  return new MdxParser();
}

function getTypeSlug(type: MemoryType): string {
  // Specific mapping to satisfy desired slugs
  if (type === 'user_preference') return 'user-preferences';
  // Default: kebab-case underscores
  return type.replace(/_/g, '-');
}

function cleanUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => cleanUndefined(v)).filter((v) => v !== undefined) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(value as any)) {
      if (v === undefined) continue;
      out[k] = cleanUndefined(v as any);
    }
    return out as T;
  }
  return value;
}