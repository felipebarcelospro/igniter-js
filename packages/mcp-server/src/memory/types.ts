export type MemoryType =
  | 'code_pattern'
  | 'architectural_decision'
  | 'user_preference'
  | 'insight'
  | 'relationship_map'
  | 'reflection'
  | 'bug_pattern'
  | 'performance_insight'
  | 'api_mapping'
  | 'requirement'
  | 'design'
  | 'task'
  | 'bug_report';

export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'testing' | 'done' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface SubTask {
  id: string;
  title: string;
  status: TaskStatus;
  order?: number;
}

export interface Relationship {
  id: string;
  type:
    | 'depends_on'
    | 'implements'
    | 'uses'
    | 'similar_to'
    | 'contradicts'
    | 'extends'
    | 'contains'
    | 'inspired_by'
    | 'supersedes';
  strength: number; // 0.0 - 1.0
  confidence: number; // 0.0 - 1.0
  metadata?: Record<string, unknown>;
  created_at: string;
  validated: boolean;
}

export interface MemoryFrontmatter {
  id: string;
  type: MemoryType;
  category?: string;
  confidence: number;
  created_at: string;
  updated_at: string;
  tags: string[];
  source:
    | 'user_input'
    | 'code_analysis'
    | 'pattern_detection'
    | 'reflection'
    | 'tool_interaction';
  project_root: string;
  related_memories?: string[];
  relationships?: Relationship[];
  metadata?: Record<string, unknown>;
  sensitive?: boolean;
  execution_order?: number;
  reordered_at?: string;

  // Task Management Fields (for requirement/design/task/bug_report types)
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee?: string;
  due_date?: string; // ISO date
  completed_at?: string; // ISO date

  // Hierarchy
  parent_id?: string; // For subtasks
  feature_id?: string; // Which feature this belongs to
  order?: number; // For ordering in lists

  // Dependencies
  dependencies?: string[]; // Memory IDs this depends on
  blocks?: string[]; // Memory IDs this blocks

  // Sub-tasks
  subtasks?: SubTask[];

  // Development specific
  acceptance_criteria?: string[]; // For tasks
  files_involved?: string[]; // Code files this affects
  test_cases?: string[]; // Test scenarios
  estimated_hours?: number;
  actual_hours?: number;

  // Enhanced delegation fields for background execution
  delegation_status?: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  delegation_started_at?: string;
  delegation_completed_at?: string;
  delegation_process_id?: number;        // PID para controle
  delegation_output_file?: string;       // Arquivo de output incremental
  delegation_progress?: string;          // Último status conhecido
  delegation_error?: string;             // Erro se falhou
  delegation_attempts?: number;          // Tentativas de execução
  delegation_timeout_minutes?: number;   // Timeout configurado

  // Legacy delegation fields (for backward compatibility)
  delegated_to?: string;                 // Agent type (legacy)
  delegated_at?: string;                 // Delegation timestamp (legacy)
  delegation_config?: Record<string, any>; // Delegation configuration (legacy)
}

export interface MemoryItem {
  id: string;
  type: MemoryType;
  title: string;
  content: string;
  frontmatter: MemoryFrontmatter;
  filePath?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface SearchQuery {
  text?: string;
  tags?: string[];
  type?: MemoryType;
  dateRange?: [Date, Date];
  confidence?: [number, number];
  includeSensitive?: boolean;
}

export interface SearchResult {
  memory: MemoryItem;
  score: number;
  matchType: 'exact' | 'partial' | 'tag' | 'metadata';
  highlights: string[];
}

export const ALL_MEMORY_TYPES: MemoryType[] = [
  'code_pattern',
  'architectural_decision',
  'user_preference',
  'insight',
  'relationship_map',
  'reflection',
  'bug_pattern',
  'performance_insight',
  'api_mapping',
  'requirement',
  'design',
  'task',
  'bug_report',
];

// Task Management specific types for Code Agent workflow
export const TASK_MANAGEMENT_TYPES: MemoryType[] = [
  'requirement',
  'design',
  'task',
  'bug_report',
];

export const KNOWLEDGE_TYPES: MemoryType[] = [
  'code_pattern',
  'architectural_decision',
  'user_preference',
  'insight',
  'relationship_map',
  'reflection',
  'bug_pattern',
  'performance_insight',
  'api_mapping',
];

export interface SearchIndex {
  memories: Map<string, MemoryItem>;
  contentIndex: Map<string, Set<string>>; // token -> memory IDs
  tagIndex: Map<string, Set<string>>;     // tag -> memory IDs
  typeIndex: Map<MemoryType, Set<string>>; // type -> memory IDs
  lastBuiltAt: number;
}
