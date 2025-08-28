/**
 * Constants used throughout the MCP Server for memory management and tool configuration.
 */

/** Available memory types for the memory management system. */
export const MEMORY_TYPES = [
  "code_pattern",
  "architectural_decision",
  "user_preference",
  "insight",
  "relationship_map",
  "reflection",
  "bug_pattern",
  "performance_insight",
  "api_mapping",
  "requirement",
  "design",
  "task",
  "bug_report",
] as const;

/** Available relationship types between memories. */
export const REL_TYPES = [
  "depends_on",
  "implements",
  "uses",
  "similar_to",
  "contradicts",
  "extends",
  "contains",
  "inspired_by",
  "supersedes",
] as const;

/** Task management specific memory types for filtering. */
export const TASK_TYPES = [
  "requirement",
  "design",
  "task",
  "bug_report",
] as const;

/** Knowledge-based memory types for filtering. */
export const KNOWLEDGE_TYPES = [
  "code_pattern",
  "architectural_decision",
  "user_preference",
  "insight",
  "relationship_map",
  "reflection",
  "bug_pattern",
  "performance_insight",
  "api_mapping",
] as const;
