import { FileSystemService } from './fs';
import { MdxParser } from './parser';
import * as path from 'path';
import type {
  MemoryItem,
  MemoryFrontmatter,
  MemoryType,
  SearchQuery,
  SearchResult,
  SearchIndex,
  TaskStatus,
  TaskPriority
} from './types';
import { TASK_MANAGEMENT_TYPES, ALL_MEMORY_TYPES } from './types';
import { executeWithAgent } from '../agents/executor';
import type { AgentProvider, AgentConfig } from '../agents/types';
import PQueue from 'p-queue';

/**
 * Orchestrates memory operations by delegating to filesystem and parsing services.
 */
export class MemoryManager {
  private readonly fs: FileSystemService;
  private readonly parser: MdxParser;
  private projectRoot!: string;
  private jobQueue: PQueue;
  private isInitialized = false;

  constructor(deps: { fs: FileSystemService; parser: MdxParser; projectRoot?: string }) {
    this.fs = deps.fs;
    this.parser = deps.parser;
    this.projectRoot = deps.projectRoot ?? process.cwd();
    this.jobQueue = new PQueue({ concurrency: 2 }); // Concorrência de no máximo 2 agentes
  }

  /** Initializes project: resolves root and ensures memory directory structure. */
  async initializeProject(): Promise<void> {
    if (this.isInitialized) return;
    this.projectRoot = await this.fs.resolveProjectRoot(this.projectRoot);
    await this.fs.ensureDirectoryStructure(this.projectRoot);
    this.isInitialized = true;
  }

  /** Returns the resolved project root used by the manager. */
  getProjectRoot(): string {
    return this.projectRoot;
  }

  /** Stub store method to be implemented in Task 2.2. */
  async store(memory: Omit<MemoryItem, 'id' | 'filePath' | 'frontmatter'> & { frontmatter?: Partial<MemoryFrontmatter> }): Promise<string> {
    await this.initializeProject();

    const nowIso = new Date().toISOString();
    const type: MemoryType = (memory as any).type;
    const id = this.parser.generateMemoryId(memory.title, type);

    const fullFrontmatter: MemoryFrontmatter = {
      id,
      type,
      category: memory.frontmatter?.category,
      confidence: memory.frontmatter?.confidence ?? 0.9,
      created_at: nowIso,
      updated_at: nowIso,
      tags: memory.frontmatter?.tags ?? [],
      source: memory.frontmatter?.source ?? 'user_input',
      project_root: this.projectRoot,
      related_memories: memory.frontmatter?.related_memories,
      relationships: memory.frontmatter?.relationships,
      metadata: memory.frontmatter?.metadata,
      sensitive: memory.frontmatter?.sensitive,
      execution_order: memory.frontmatter?.execution_order ?? 0,
      reordered_at: nowIso
    };

    const item: MemoryItem = {
      id,
      type,
      title: memory.title,
      content: memory.content,
      frontmatter: fullFrontmatter,
    };

    const mdx = this.parser.generateMdxContent(item);
    const dirPath = this.getHierarchicalPath(type, fullFrontmatter);
    const filePath = this.fs.getMemoryFilePath(this.projectRoot, dirPath, id);
    await this.fs.writeFileAtomic(filePath, mdx);

    return filePath;
  }

  /** Loads a memory by type and id. */
  async getById(type: MemoryType, id: string): Promise<MemoryItem | null> {
    await this.initializeProject();
    // Use the comprehensive findByIdAcrossTypes for robust searching
    const item = await this.findByIdAcrossTypes(id);
    // Return the item only if it matches the expected type
    return item && item.type === type ? item : null;
  }

  private async findFileById(directory: string, id: string): Promise<string | null> {
    const allFiles = await this._listAllMdxFiles(directory);
    const targetFile = `${id}.mdx`;
    for (const file of allFiles) {
        if (path.basename(file) === targetFile) {
            return file;
        }
    }
    return null;
  }

  private async _listAllMdxFiles(directory: string): Promise<string[]> {
    let allFiles: string[] = [];
    if (!(await this.fs.pathExists(directory))) {
      return [];
    }
    const entries = await this.fs.listDirContents(directory); // Use listDirContents
    for (const entry of entries) {
      const entryPath = path.join(directory, entry.name);
      if (entry.is_directory) {
        allFiles = allFiles.concat(await this._listAllMdxFiles(entryPath));
      } else if (entry.name.endsWith('.mdx')) {
        allFiles.push(entryPath);
      }
    }
    return allFiles;
  }

  /** Lists all memories of a given type. */
  async listByType(type: MemoryType): Promise<MemoryItem[]> {
    await this.initializeProject();

    // Get the base directory for the memory type
    const baseDir = this.fs.getMemoryTypeDir(this.projectRoot, mapTypeToDir(type));
    
    const files = await this._listAllMdxFiles(baseDir); // Use the new recursive helper
    const items: MemoryItem[] = [];
    for (const f of files) {
      try {
        const content = await this.fs.readFileUtf8(f);
        items.push(this.parser.parseContent(content, f));
      } catch {
        // ignore malformed files in listing
      }
    }
    return items;
  }

  /** Updates an existing memory's content/frontmatter; bumps updated_at. */
  async update(memory: { type: MemoryType; id: string; title?: string; content?: string; frontmatter?: Partial<MemoryFrontmatter> }): Promise<string> {
    const existing = await this.getById(memory.type, memory.id);
    if (!existing) throw new Error('Memory not found');
    const nowIso = new Date().toISOString();
    const updated: MemoryItem = {
      ...existing,
      title: memory.title ?? existing.title,
      content: memory.content ?? existing.content,
      frontmatter: {
        ...existing.frontmatter,
        ...memory.frontmatter,
        updated_at: nowIso,
      },
    };
    const mdx = this.parser.generateMdxContent(updated);
    const filePath = this.fs.getMemoryFilePath(this.projectRoot, this.getHierarchicalPath(memory.type, updated.frontmatter), memory.id);
    await this.fs.writeFileAtomic(filePath, mdx);
    
    return filePath;
  }

  /** Deletes a memory file. */
  async delete(type: MemoryType, id: string): Promise<void> {
    await this.initializeProject();

    // Get the memory before deletion for cache cleanup
    const existing = await this.getById(type, id);

    const filePath = this.fs.getMemoryFilePath(this.projectRoot, this.getHierarchicalPath(type, existing?.frontmatter || {} as any), id);
    await this.fs.deleteFile(filePath);
  }

  /** Enhanced content search with optimized indexing and task-specific filtering. */
  async searchByContent(query: SearchQuery): Promise<SearchResult[]> {
    await this.initializeProject();

    const index = await this.buildSearchIndex();

    const types = query.type ? [query.type] : ALL_MEMORY_TYPES;
    const results: SearchResult[] = [];
    const text = (query.text ?? '').toLowerCase();
    const [minC, maxC] = query.confidence ?? [0, 1];
    const [start, end] = query.dateRange ?? [new Date(0), new Date(8640000000000000)];

    // Use index for faster search when available
    const candidateIds = new Set<string>();

    if (text && index) {
      // Use content index for text search
      const tokens = tokenize(text);
      for (const token of tokens) {
        const ids = index.contentIndex.get(token);
        if (ids) {
          ids.forEach(id => candidateIds.add(id));
        }
      }
    }

    if (query.tags && query.tags.length > 0 && index) {
      // Use tag index for tag search
      const tagCandidates = new Set<string>();
      for (const tag of query.tags) {
        const ids = index.tagIndex.get(tag);
        if (ids) {
          if (tagCandidates.size === 0) {
            ids.forEach(id => tagCandidates.add(id));
          } else {
            // Intersection for AND logic
            const intersection = new Set<string>();
            for (const id of tagCandidates) {
              if (ids.has(id)) intersection.add(id);
            }
            tagCandidates.clear();
            intersection.forEach(id => tagCandidates.add(id));
          }
        }
      }

      if (candidateIds.size === 0) {
        tagCandidates.forEach(id => candidateIds.add(id));
      } else {
        // Intersection of text and tag results
        const intersection = new Set<string>();
        for (const id of candidateIds) {
          if (tagCandidates.has(id)) intersection.add(id);
        }
        candidateIds.clear();
        intersection.forEach(id => candidateIds.add(id));
      }
    }

    // If no specific search criteria, get all memories of specified types
    if (candidateIds.size === 0) {
      for (const type of types) {
        const typeIds = index?.typeIndex.get(type);
        if (typeIds) {
          typeIds.forEach(id => candidateIds.add(id));
        }
      }
    }

    // Process candidates
    for (const id of candidateIds) {
      const m = index?.memories.get(id);
      if (!m) continue;

      // Type filter
      if (!types.includes(m.type)) continue;

      // Date filter
      const updatedAt = new Date(m.frontmatter.updated_at);
      if (updatedAt < start || updatedAt > end) continue;

      // Confidence filter
      if (m.frontmatter.confidence < minC || m.frontmatter.confidence > maxC) continue;

      // Sensitive filter
      if (!query.includeSensitive && m.frontmatter.sensitive) continue;

      // Calculate score
      let score = 0;
      const highlights: string[] = [];

      if (text) {
        const hay = `${m.title}\n${m.content}\n${JSON.stringify(m.frontmatter)}`.toLowerCase();
        if (hay.includes(text)) {
          score += 1;
          // Enhanced scoring based on where match occurs
          if (m.title.toLowerCase().includes(text)) score += 0.5;
          if (m.frontmatter.tags.some(tag => tag.toLowerCase().includes(text))) score += 0.3;
          highlights.push(`match: ${m.title}`);
        }
      } else {
        score += 0.1; // baseline if only filters are used
      }

      if (score > 0) {
        results.push({ memory: m, score, matchType: text ? 'partial' : 'metadata', highlights });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results;
  }

  /** @ts-expect-error - Adds or updates a relationship from one memory to another. TODO: fix this */
  async addRelationship(from: { type: MemoryType; id: string }, to: { type: MemoryType; id: string }, rel: Omit<MemoryFrontmatter['relationships'][number], 'id' | 'created_at'> & { validated?: boolean }): Promise<void> {
    const fromItem = await this.getById(from.type, from.id);
    if (!fromItem) throw new Error('Source memory not found');
    const nowIso = new Date().toISOString();
    const newRel = {
      id: to.id,
      target_type: to.type,
      type: rel.type,
      strength: rel.strength,
      confidence: rel.confidence,
      metadata: rel.metadata,
      validated: rel.validated ?? false,
      created_at: nowIso,
    } as NonNullable<MemoryFrontmatter['relationships']>[number];

    const existing = fromItem.frontmatter.relationships ?? [];
    const idx = existing.findIndex((r) => r.id === to.id && r.type === rel.type);
    if (idx >= 0) existing[idx] = newRel; else existing.push(newRel);
    fromItem.frontmatter.relationships = existing;
    fromItem.frontmatter.updated_at = nowIso;
    await this.update({ type: from.type, id: from.id, frontmatter: { relationships: existing } });
  }

  /** Removes a relationship (any type) from one memory to another. */
  async removeRelationship(from: { type: MemoryType; id: string }, to: { type: MemoryType; id: string }): Promise<void> {
    const fromItem = await this.getById(from.type, from.id);
    if (!fromItem) return;
    const filtered = (fromItem.frontmatter.relationships ?? []).filter((r) => r.id !== to.id);
    await this.update({ type: from.type, id: from.id, frontmatter: { relationships: filtered } });
  }

  /** Returns directly related memories (one hop). */
  async getDirectlyRelatedMemories(center: { type: MemoryType; id: string }): Promise<MemoryItem[]> {
    const centerItem = await this.getById(center.type, center.id);
    if (!centerItem) return [];
    const rels = centerItem.frontmatter.relationships ?? [];
    const results: MemoryItem[] = [];
    for (const r of rels) {
      // Use the target_type for efficient lookup
      if (r.target_type) {
        const item = await this.getById(r.target_type, r.id);
        if (item) {
          results.push(item);
        }
      } else {
        // Fallback for older relationships without target_type
        const item = await this.findByIdAcrossTypes(r.id);
        if (item) {
          results.push(item);
        }
      }
    }
    return results;
  }

  /** Generates a Mermaid relationship graph from a center node up to a given depth. */
  async generateRelationshipGraph(center: { type: MemoryType; id: string }, depth: number = 1): Promise<string> {
    await this.initializeProject();
    const visited = new Set<string>();
    const edges: Array<{ from: string; to: string; type: string }> = [];
    const queue: Array<{ type: MemoryType; id: string; d: number }> = [{ ...center, d: 0 }];

    while (queue.length > 0) {
      const { type, id, d } = queue.shift()!;
      const key = `${type}:${id}`;
      if (visited.has(key) || d > depth) continue;
      visited.add(key);
      const item = await this.getById(type, id);
      if (!item) continue;
      for (const r of item.frontmatter.relationships ?? []) {
        const target = await this.findByIdAcrossTypes(r.id);
        if (!target) continue;
        edges.push({ from: item.id, to: target.id, type: r.type });
        queue.push({ type: target.type, id: target.id, d: d + 1 });
      }
    }

    const lines: string[] = [];
    lines.push('graph TD');
    for (const e of edges) {
      lines.push(`  ${escapeId(e.from)}-->${escapeId(e.to)}`);
    }
    return lines.join('\n') + '\n';
  }

  private async findByIdAcrossTypes(id: string): Promise<MemoryItem | null> {
    await this.initializeProject(); // Ensure project is initialized before file system operations
    for (const type of ALL_MEMORY_TYPES) {
      const baseDir = this.fs.getMemoryTypeDir(this.projectRoot, mapTypeToDir(type));
      const filePath = await this.findFileById(baseDir, id);
      if (filePath) {
        try {
          const content = await this.fs.readFileUtf8(filePath);
          const item = this.parser.parseContent(content, filePath);
          if (item.id === id) {
              return item;
          }
        } catch (error) {
          console.warn(`Error parsing memory file ${filePath}:`, error);
        }
      }
    }
    return null;
  }

  /** Builds optimized in-memory search index with task-specific indexing. */
  async buildSearchIndex(types?: MemoryType[]): Promise<SearchIndex> {
    const targetTypes = types ?? ALL_MEMORY_TYPES;
    const memories = await this.getAllMemories(targetTypes);
    const idx: SearchIndex = {
      memories: new Map(),
      contentIndex: new Map(),
      tagIndex: new Map(),
      typeIndex: new Map(),
      lastBuiltAt: Date.now(),
    };

    // Initialize type index
    for (const t of targetTypes) idx.typeIndex.set(t, new Set());

    // Build task index separately for faster task operations
    const taskIndex = new Map<string, MemoryItem>();

    for (const m of memories) {
      idx.memories.set(m.id, m);
      idx.typeIndex.get(m.type)?.add(m.id);

      // Enhanced tokenization including frontmatter fields
      const contentText = `${m.title} ${m.content}`;
      const metadataText = [
        m.frontmatter.category,
        m.frontmatter.assignee,
        m.frontmatter.feature_id,
        m.frontmatter.status,
        m.frontmatter.priority,
        ...(m.frontmatter.acceptance_criteria || []),
        ...(m.frontmatter.files_involved || [])
      ].filter(Boolean).join(' ');

      const tokens = tokenize(`${contentText} ${metadataText}`);
      for (const tok of tokens) {
        if (!idx.contentIndex.has(tok)) idx.contentIndex.set(tok, new Set());
        idx.contentIndex.get(tok)!.add(m.id);
      }

      for (const tag of m.frontmatter.tags ?? []) {
        if (!idx.tagIndex.has(tag)) idx.tagIndex.set(tag, new Set());
        idx.tagIndex.get(tag)!.add(m.id);
      }

      // Add to task index if it's a task-related type
      if (TASK_MANAGEMENT_TYPES.includes(m.type)) {
        taskIndex.set(m.id, m);
      }
    }

    return idx;
  }

  /** Fuzzy search by token edit distance threshold. */
  async fuzzySearch(text: string, maxDistance: number = 1, type?: MemoryType): Promise<SearchResult[]> {
    await this.initializeProject();
    const index = await this.buildSearchIndex(type ? [type] : undefined);
    const tokens = tokenize(text);
    const candidateIds = new Set<string>();
    for (const [tok, ids] of index.contentIndex.entries()) {
      for (const q of tokens) {
        if (levenshtein(tok, q) <= maxDistance) {
          ids.forEach((id) => candidateIds.add(id));
        }
      }
    }
    const results: SearchResult[] = [];
    for (const id of candidateIds) {
      const m = index.memories.get(id)!;
      results.push({ memory: m, score: 1, matchType: 'partial', highlights: [] });
    }
    results.sort((a, b) => b.score - a.score);
    return results;
  }

  private async getAllMemories(types: MemoryType[]): Promise<MemoryItem[]> {
    const all: MemoryItem[] = [];
    for (const t of types) {
      const items = await this.listByType(t);
      all.push(...items);
    }
    return all;
  }

  // ============ TASK MANAGEMENT OPTIMIZED METHODS ============

  /** Optimized task listing with filtering and sorting for task management tools. */
  async listTasks(filters: {
    status?: TaskStatus;
    priority?: TaskPriority;
    assignee?: string;
    feature_id?: string;
    epic_id?: string;
    parent_id?: string;
    has_dependencies?: boolean;
    is_blocked?: boolean;
    due_before?: Date;
    created_after?: Date;
    tags?: string[];
    limit?: number;
  } = {}): Promise<MemoryItem[]> {
    await this.initializeProject();

    const index = await this.buildSearchIndex();

    let tasks = Array.from(index.memories.values()).filter(t => TASK_MANAGEMENT_TYPES.includes(t.type));

    // Apply filters
    if (filters.status) {
      tasks = tasks.filter(t => t.frontmatter.status === filters.status);
    }

    if (filters.priority) {
      tasks = tasks.filter(t => t.frontmatter.priority === filters.priority);
    }

    if (filters.assignee) {
      tasks = tasks.filter(t => t.frontmatter.assignee === filters.assignee);
    }

    if (filters.feature_id) {
      tasks = tasks.filter(t => t.frontmatter.feature_id === filters.feature_id);
    }

    if (filters.epic_id) {
      tasks = tasks.filter(t => t.frontmatter.feature_id === filters.epic_id || t.frontmatter.tags.includes(`epic-${filters.epic_id}`));
    }

    if (filters.parent_id) {
      tasks = tasks.filter(t => t.frontmatter.parent_id === filters.parent_id);
    }

    if (filters.has_dependencies !== undefined) {
      tasks = tasks.filter(t => filters.has_dependencies ?
        (t.frontmatter.dependencies && t.frontmatter.dependencies.length > 0) :
        (!t.frontmatter.dependencies || t.frontmatter.dependencies.length === 0)
      );
    }

    if (filters.is_blocked !== undefined) {
      tasks = tasks.filter(t => filters.is_blocked ?
        (t.frontmatter.blocks && t.frontmatter.blocks.length > 0) :
        (!t.frontmatter.blocks || t.frontmatter.blocks.length === 0)
      );
    }

    if (filters.due_before) {
      tasks = tasks.filter(t => t.frontmatter.due_date && new Date(t.frontmatter.due_date) <= filters.due_before!);
    }

    if (filters.created_after) {
      tasks = tasks.filter(t => new Date(t.frontmatter.created_at) >= filters.created_after!);
    }

    if (filters.tags && filters.tags.length > 0) {
      tasks = tasks.filter(t => filters.tags!.every(tag => t.frontmatter.tags.includes(tag)));
    }

    // Sort by priority and creation date
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
    tasks.sort((a, b) => {
      const aPriority = priorityOrder[a.frontmatter.priority as keyof typeof priorityOrder] || 0;
      const bPriority = priorityOrder[b.frontmatter.priority as keyof typeof priorityOrder] || 0;

      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }

      // Then by creation date (newer first)
      return new Date(b.frontmatter.created_at).getTime() - new Date(a.frontmatter.created_at).getTime();
    });

    // Apply limit
    if (filters.limit && filters.limit > 0) {
      tasks = tasks.slice(0, filters.limit);
    }

    return tasks;
  }

  /** Get task statistics and workload analysis. */
  async getTaskStatistics(filters: { assignee?: string; feature_id?: string } = {}): Promise<{
    total: number;
    by_status: Record<TaskStatus, number>;
    by_priority: Record<TaskPriority, number>;
    by_assignee: Record<string, number>;
    estimated_hours: number;
    actual_hours: number;
    completion_rate: number;
    blocked_tasks: number;
    overdue_tasks: number;
  }> {
    const tasks = await this.listTasks(filters);

    const stats = {
      total: tasks.length,
      by_status: { todo: 0, in_progress: 0, blocked: 0, testing: 0, done: 0, cancelled: 0 } as Record<TaskStatus, number>,
      by_priority: { low: 0, medium: 0, high: 0, urgent: 0 } as Record<TaskPriority, number>,
      by_assignee: {} as Record<string, number>,
      estimated_hours: 0,
      actual_hours: 0,
      completion_rate: 0,
      blocked_tasks: 0,
      overdue_tasks: 0
    };

    const now = new Date();
    let completedTasks = 0;

    for (const task of tasks) {
      // Status counts
      const status = task.frontmatter.status as TaskStatus || 'todo';
      stats.by_status[status]++;

      // Priority counts
      const priority = task.frontmatter.priority as TaskPriority || 'medium';
      stats.by_priority[priority]++;

      // Assignee counts
      const assignee = task.frontmatter.assignee || 'unassigned';
      stats.by_assignee[assignee] = (stats.by_assignee[assignee] || 0) + 1;

      // Hours
      stats.estimated_hours += task.frontmatter.estimated_hours || 0;
      stats.actual_hours += task.frontmatter.actual_hours || 0;

      // Completion tracking
      if (status === 'done') completedTasks++;

      // Blocked tasks
      if (status === 'blocked' || (task.frontmatter.blocks && task.frontmatter.blocks.length > 0)) {
        stats.blocked_tasks++;
      }

      // Overdue tasks
      if (task.frontmatter.due_date && new Date(task.frontmatter.due_date) < now && status !== 'done') {
        stats.overdue_tasks++;
      }
    }

    stats.completion_rate = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

    return stats;
  }

  /** Find tasks that are candidates for delegation based on criteria. */
  async findDelegationCandidates(criteria: {
    complexity_threshold?: 'low' | 'medium' | 'high';
    independence_required?: boolean;
    assignee_filter?: string;
    exclude_sensitive?: boolean;
    max_estimated_hours?: number;
    required_tags?: string[];
    exclude_tags?: string[];
  } = {}): Promise<MemoryItem[]> {
    const tasks = await this.listTasks({
      status: 'todo',
      assignee: criteria.assignee_filter
    });

    return tasks.filter(task => {
      // Independence check - no unresolved dependencies
      if (criteria.independence_required && task.frontmatter.dependencies && task.frontmatter.dependencies.length > 0) {
        return false;
      }

      // Complexity check based on estimated hours and tags
      if (criteria.complexity_threshold) {
        const estimatedHours = task.frontmatter.estimated_hours || 0;
        const complexityTags = task.frontmatter.tags.filter(tag =>
          tag.includes('complex') || tag.includes('architecture') || tag.includes('integration')
        );

        const isComplex = estimatedHours > 8 || complexityTags.length > 0;
        const isSimple = estimatedHours <= 2 && !complexityTags.length;

        if (criteria.complexity_threshold === 'low' && !isSimple) return false;
        if (criteria.complexity_threshold === 'high' && !isComplex) return false;
      }

      // Sensitive content filter
      if (criteria.exclude_sensitive && task.frontmatter.sensitive) {
        return false;
      }

      // Hours limit
      if (criteria.max_estimated_hours && (task.frontmatter.estimated_hours || 0) > criteria.max_estimated_hours) {
        return false;
      }

      // Required tags
      if (criteria.required_tags && !criteria.required_tags.every(tag => task.frontmatter.tags.includes(tag))) {
        return false;
      }

      // Excluded tags
      if (criteria.exclude_tags && criteria.exclude_tags.some(tag => task.frontmatter.tags.includes(tag))) {
        return false;
      }

      return true;
    });
  }

  /** Efficiently update task status with optimized index updates. */
  async updateTaskStatus(taskId: string, newStatus: TaskStatus, notes?: string): Promise<void> {
    const task = await this.getById('task', taskId);
    if (!task) {
      throw new Error(`Task with ID ${taskId} not found`);
    }

    const updates: Partial<MemoryFrontmatter> = {
      status: newStatus,
      updated_at: new Date().toISOString()
    };

    if (newStatus === 'done') {
      updates.completed_at = new Date().toISOString();
    }

    if (notes) {
      // Append notes to content
      const updatedContent = `${task.content}\n\n## Status Update - ${new Date().toISOString()}\n${notes}`;
      await this.update({
        type: task.type,
        id: taskId,
        content: updatedContent,
        frontmatter: updates
      });
    } else {
      await this.update({
        type: task.type,
        id: taskId,
        frontmatter: updates
      });
    }
  }

  /** Get task dependency chain for delegation planning. */
  async getTaskDependencyChain(taskId: string, depth: number = 3): Promise<{
    dependencies: MemoryItem[];
    dependents: MemoryItem[];
    blocked_by: string[];
    blocking: string[];
  }> {
    const task = await this.getById('task', taskId);
    if (!task) {
      return { dependencies: [], dependents: [], blocked_by: [], blocking: [] };
    }

    const dependencies: MemoryItem[] = [];
    const dependents: MemoryItem[] = [];
    const visited = new Set<string>();

    // Find dependencies recursively
    const findDependencies = async (currentTaskId: string, currentDepth: number) => {
      if (currentDepth >= depth || visited.has(currentTaskId)) return;
      visited.add(currentTaskId);

      const currentTask = await this.getById('task', currentTaskId);
      if (!currentTask) return;

      for (const depId of currentTask.frontmatter.dependencies || []) {
        const depTask = await this.getById('task', depId);
        if (depTask && !dependencies.find(d => d.id === depId)) {
          dependencies.push(depTask);
          await findDependencies(depId, currentDepth + 1);
        }
      }
    };

    // Find dependents
    const allTasks = await this.listByType('task');
    for (const t of allTasks) {
      if (t.frontmatter.dependencies?.includes(taskId)) {
        dependents.push(t);
      }
    }

    await findDependencies(taskId, 0);

    return {
      dependencies,
      dependents,
      blocked_by: task.frontmatter.dependencies || [],
      blocking: task.frontmatter.blocks || []
    };
  }

  /**
   * Generate hierarchical directory path based on memory type and metadata
   */
  private getHierarchicalPath(type: MemoryType, frontmatter: MemoryFrontmatter): string {
    const baseDir = mapTypeToDir(type);

    // For task management types, DO NOT create a hierarchical structure based on metadata.
    // This was the source of the bug where tasks were not being found.
    // All tasks should be saved in their root type directory (e.g., 'project/tasks').
    if (TASK_MANAGEMENT_TYPES.includes(type as any)) {
      return baseDir;
    }

    // For other types, use category-based organization if available
    if (frontmatter.category) {
      return `${baseDir}/${frontmatter.category}`;
    }

    return baseDir;
  }

  // ============ BACKGROUND JOB MANAGEMENT ============

  /** Start a background agent delegation job. */
  async startBackgroundDelegation(
    taskId: string,
    agentType: AgentProvider,
    config: AgentConfig,
    outputFile: string
  ): Promise<{ success: boolean; job_id: string; message: string }> {
    try {
      const task = await this.getById('task', taskId);
      if (!task) {
        return { success: false, job_id: '', message: `Task with ID ${taskId} not found` };
      }

      // Check if task is already delegated
      if (task.frontmatter.delegation_status === 'running' || task.frontmatter.delegation_status === 'queued') {
        return {
          success: false,
          job_id: '',
          message: `Task ${taskId} is already delegated (status: ${task.frontmatter.delegation_status})`
        };
      }

      // Generate unique job ID
      const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Update task with delegation info
      await this.update({
        type: 'task',
        id: taskId,
        frontmatter: {
          delegation_status: 'queued',
          delegated_to: agentType,
          delegated_at: new Date().toISOString(),
          delegation_started_at: new Date().toISOString(),
          delegation_config: {
            agent_type: agentType,
            sandbox: config?.sandbox_enabled ?? true,
            timeout_minutes: config?.timeout_minutes || 30
          },
          delegation_timeout_minutes: config?.timeout_minutes || 30,
          delegation_attempts: 0,
          status: 'in_progress',
          assignee: 'agent',
          delegation_output_file: outputFile // Store the output file path
        }
      });

      // Start background execution
      this.jobQueue.add(() => this.executeBackgroundJob(jobId, taskId, agentType, config, outputFile));

      return {
        success: true,
        job_id: jobId,
        message: `Task ${taskId} delegated to ${agentType} agent. Job ID: ${jobId}`
      };

    } catch (error: any) {
      return {
        success: false,
        job_id: '',
        message: `Error starting delegation: ${error.message}`
      };
    }
  }

  /** Re-enqueues jobs that were interrupted by a server restart. */
  async requeueInterruptedJobs(): Promise<void> {
    const allTasks = await this.listByType('task');
    
    const interruptedTasks = allTasks.filter(task =>
      task.frontmatter.delegation_status === 'running' ||
      task.frontmatter.delegation_status === 'queued'
    );

    if (interruptedTasks.length > 0) {
      for (const task of interruptedTasks) {
        const { id, title, content, frontmatter } = task;
        const agentType = frontmatter.delegated_to as AgentProvider;
        const config = frontmatter.delegation_config as AgentConfig;
        const outputFile = frontmatter.delegation_output_file;

        if (agentType && config && outputFile) {
          // Add a note to the log file
          try {
            const logNote = `\n--- [SERVER RESTART DETECTED at ${new Date().toISOString()}] ---\nRe-enqueuing interrupted job.\n---\n`;
            await this.fs.appendFile(outputFile, logNote);
          } catch (e) {
            // This is a non-critical error, so we can ignore it
          }

          // Reset status to 'queued' and add to the queue
          await this.update({
            type: 'task',
            id,
            frontmatter: {
              delegation_status: 'queued',
              delegation_progress: 'Re-queued after server restart.'
            }
          });

          this.jobQueue.add(() => this.executeBackgroundJob(`requeued-${id}`, id, agentType, config, outputFile));
        }
      }
    }
  }

  /** Execute agent delegation in background. */
  private async executeBackgroundJob(jobId: string, taskId: string, agentType: AgentProvider, config: AgentConfig, outputFile: string): Promise<void> {
    try {
      // Update status to running
      await this.update({
        type: 'task',
        id: taskId,
        frontmatter: {
          delegation_status: 'running',
          delegation_progress: 'Starting agent execution...', 
          delegation_output_file: outputFile
        }
      });

      // Ensure output file exists
      await this.fs.ensureDirectoryStructure(this.projectRoot);
      await this.fs.writeFileAtomic(outputFile, `Job started at ${new Date().toISOString()}\n`);
      await this.fs.writeFileAtomic(outputFile, `Output will be streamed to this file in real-time.\n`);

      const task = await this.getById('task', taskId);
      if (!task) {
        throw new Error(`Task ${taskId} not found for execution.`);
      }

      // Check if task has been cancelled
      if (task.frontmatter.delegation_status === 'cancelled') {
        await this.update({
          type: 'task',
          id: taskId,
          frontmatter: {
            delegation_status: 'cancelled',
            delegation_progress: 'Delegation cancelled by user before execution started.',
            status: 'todo'
          }
        });
        return; // Exit if task was cancelled
      }

      // Execute the agent
      const result = await executeWithAgent(
        agentType,
        task.title,
        task.content,
        { ...config, logFilePath: outputFile } // Pass log file path to execAsync
      );

      // Update task with process ID
      await this.update({
        type: 'task',
        id: taskId,
        frontmatter: {
          delegation_process_id: result.pid
        }
      });

      // Log the final report summary to the output file
      const logContent = `
=====================================
Agent Execution Summary
=====================================
- **Status:** ${result.success ? '✅ Success' : '❌ Failed'}
- **Agent:** ${result.agent_used}
- **Execution Time:** ${result.execution_time}s
- **YOLO Mode:** ${result.yolo_mode_used}
- **Sandbox:** ${result.sandbox_used}
- **Command:** ${result.command_executed || 'N/A'}
- **Exit Code:** ${result.exit_code || 'N/A'}

${result.error ? `--- Final Error/Issue ---
${result.error}
` : ''}
`;
      const existingContent = await this.fs.readFileUtf8(outputFile);
      await this.fs.writeFileAtomic(outputFile, existingContent + logContent);


      // Update task based on result
      if (result.success) {
        await this.update({
          type: 'task',
          id: taskId,
          frontmatter: {
            delegation_status: 'completed',
            delegation_completed_at: new Date().toISOString(),
            delegation_progress: 'Agent execution completed successfully',
            status: 'done',
            execution_time: result.execution_time
          }
        });
      } else {
        await this.update({
          type: 'task',
          id: taskId,
          frontmatter: {
            delegation_status: 'failed',
            delegation_error: result.error || 'Agent execution failed without a specific error message.',
            delegation_progress: 'Agent execution failed',
            status: 'blocked'
          }
        });
      }

    } catch (error: any) {
      const errorMessage = `Critical error during background job execution: ${error.message}`;
      try {
        const existingContent = await this.fs.readFileUtf8(outputFile);
        await this.fs.writeFileAtomic(outputFile, `${existingContent}\n\n--- CRITICAL ERROR ---\n${errorMessage}`);
      } catch (e) {
        // If reading the original log fails, just write the error.
        await this.fs.writeFileAtomic(outputFile, `--- CRITICAL ERROR ---\n${errorMessage}`);
      }
      await this.update({
        type: 'task',
        id: taskId,
        frontmatter: {
          delegation_status: 'failed',
          delegation_error: errorMessage,
          delegation_progress: 'Agent execution failed due to a system error.'
        }
      });
    }
  }

  /** Get delegation status for a task. */
  async getDelegationStatus(taskId: string): Promise<{
    status: string;
    progress: string;
    output: string;
    error?: string;
    started_at?: string;
    completed_at?: string;
    agent_type?: string;
  }> {
    const task = await this.getById('task', taskId);
    if (!task) {
      return { status: 'not_found', progress: '', output: '' };
    }

    let output = '';
    if (task.frontmatter.delegation_output_file) {
      try {
        // Read only last N lines for performance, or full if small
        const fullOutput = await this.fs.readFileUtf8(task.frontmatter.delegation_output_file);
        const lines = fullOutput.split('\n');
        const maxLines = 200; // Limit output for display
        output = lines.length > maxLines ? lines.slice(-maxLines).join('\n') : fullOutput;

        // Add a note if output was truncated
        if (lines.length > maxLines) {
          output = `... (output truncated, showing last ${maxLines} lines)\n` + output;
        }

      } catch (e) {
        output = `Output file not accessible or error reading: ${(e as Error).message}`;
      }
    }

    return {
      status: task.frontmatter.delegation_status || 'not_delegated',
      progress: task.frontmatter.delegation_progress || '',
      output,
      error: task.frontmatter.delegation_error,
      started_at: task.frontmatter.delegation_started_at,
      completed_at: task.frontmatter.delegation_completed_at,
      agent_type: task.frontmatter.delegated_to
    };
  }

  /** Cancel a running delegation. */
  async cancelDelegation(taskId: string): Promise<{ success: boolean; message: string }> {
          try {
        const task = await this.getById('task', taskId);
        if (!task) {
          return { success: false, message: `Task with ID ${taskId} not found` };
        }

      if (task.frontmatter.delegation_status !== 'running' && task.frontmatter.delegation_status !== 'queued') {
        return { success: false, message: `Task is not running or queued (status: ${task.frontmatter.delegation_status})` };
      }

      // If queued, mark as cancelled. The job runner will skip it.
      if (task.frontmatter.delegation_status === 'queued') {
        await this.update({
          type: 'task',
          id: taskId,
          frontmatter: {
            delegation_status: 'cancelled',
            delegation_progress: 'Delegation cancelled by user before execution started.',
            status: 'todo'
          }
        });
        return { success: true, message: `Delegation for task ${taskId} was pending and has been cancelled.` };
      }

      // Kill process if running
      if (task.frontmatter.delegation_process_id) {
        try {
          process.kill(task.frontmatter.delegation_process_id, 'SIGTERM');
        } catch (e) {
          return { success: false, message: `Error killing process ${task.frontmatter.delegation_process_id}: ${(e as Error).message}` };
        }
      } else {
        return { success: false, message: `No process ID found for task ${taskId} to kill.` };
      }

      // Update task status
      await this.update({
        type: 'task',
        id: taskId,
        frontmatter: {
          delegation_status: 'cancelled',
          delegation_progress: 'Delegation cancelled by user',
          status: 'todo',
          delegation_process_id: undefined // Clear the process ID
        }
      });

      return { success: true, message: `Delegation for task ${taskId} cancelled successfully` };

    } catch (error: any) {
      return { success: false, message: `Error cancelling delegation: ${error.message}` };
    }
  }

  /** List all active delegations. */
  async listActiveDelegations(): Promise<MemoryItem[]> {
    const allTasks = await this.listByType('task');
    return allTasks.filter(task =>
      task.frontmatter.delegation_status === 'running' ||
      task.frontmatter.delegation_status === 'queued'
    );
  }

  /** Creates a simple periodic reflection memory summarizing tag distribution. */
  async createPeriodicReflection(): Promise<string> {
    await this.initializeProject();
    const types: MemoryType[] = ['code_pattern','architectural_decision','user_preference','insight','relationship_map','reflection','bug_pattern','performance_insight','api_mapping'] as MemoryType[];
    const all = await this.getAllMemories(types);
    const tagCounts = new Map<string, number>();
    for (const m of all) {
      for (const t of m.frontmatter.tags ?? []) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
    }
    const lines = Array.from(tagCounts.entries()).sort((a,b)=>b[1]-a[1]).map(([t,c])=>`- ${t}: ${c}`);
    const content = `# Reflection\n\n## Tag Distribution\n${lines.join('\n')}`;
    const filePath = await this.store({ type: 'reflection', title: 'Periodic Reflection', content } as any);
    return filePath;
  }
}

/** Factory for MemoryManager with default services. */
export function createMemoryManager(deps: { fs: FileSystemService; parser: MdxParser; projectRoot?: string }): MemoryManager {
  return new MemoryManager(deps);
}

function mapTypeToDir(type: MemoryType): string {
  switch (type) {
    case 'code_pattern':
      return 'patterns';
    case 'architectural_decision':
      return 'decisions';
    case 'user_preference':
      return 'preferences';
    case 'insight':
      return 'insights';
    case 'relationship_map':
      return 'relationships';
    case 'reflection':
      return 'reflections';
    case 'bug_pattern':
      return 'insights';
    case 'performance_insight':
      return 'insights';
    case 'api_mapping':
      return 'insights';
    // Task Management Types - Hierarchical Organization
    case 'requirement':
      return 'project/requirements';
    case 'design':
      return 'project/designs';
    case 'task':
      return 'project/tasks';
    case 'bug_report':
      return 'project/bugs';
    default:
      return 'insights';
  }
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[m][n];
}

function escapeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, '_');
}
