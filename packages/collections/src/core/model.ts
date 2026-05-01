/**
 * @fileoverview Collection manager for @igniter-js/collections
 * @module @igniter-js/collections/core/collection-manager
 *
 * @description
 * Handles CRUD operations for a specific markdown collection.
 * Executes hooks, validates against schemas, and manages file I/O.
 */

import type { StandardJSONSchemaV1, StandardSchemaV1, StandardTypedV1 } from "@standard-schema/spec";
import type { IgniterLogger } from "@igniter-js/common";
import type { IgniterTelemetryManager } from "@igniter-js/telemetry";
import Handlebars from "handlebars";
import {
  IgniterCollectionError,
  IGNITER_COLLECTION_ERROR_CODES,
} from "../errors/collection.error";
import type { IgniterCollectionAdapter } from "../types/adapter";
import type {
  IgniterCollectionModelDefinition,
  IgniterCollectionModelHooks,
  IgniterCollectionDocument,
  IgniterCollectionDocumentSearchFields,
} from "../types/collection";
import type { IIgniterCollectionsManager, IIgniterCollectionModel, FindManyResult } from "../types/manager";
import type { IgniterCollectionViewDefinition, IIgniterCollectionViewManager } from "../types/view";
import type {
  IgniterCollectionCountArgs,
  IgniterCollectionCreateArgs,
  IgniterCollectionDeleteArgs,
  IgniterCollectionFindManyArgs,
  IgniterCollectionFindUniqueArgs,
  IgniterCollectionUpdateArgs,
  IgniterCollectionWhereClause,
  IgniterCollectionSearchFilter,
  NormalizeSchema,
} from "../types/query";
import { IgniterCollectionParser } from "../utils/parser";
import { IgniterCollectionPath } from "../utils/path";

import { IgniterCollectionViewManager } from "./view-manager";
import type { IgniterCollectionTelemetryEventsType } from "src/telemetry";

/**
 * Configuration for collection manager.
 */
interface CollectionManagerConfig<
  TSchema extends Record<string, any>,
  TViews extends Record<string, IgniterCollectionViewDefinition> = Record<
    string,
    IgniterCollectionViewDefinition
  >,
> {
  definition: IgniterCollectionModelDefinition<TSchema, TViews>;
  adapter: IgniterCollectionAdapter;
  basePath: string;
  /** Reference to the parent manager (required for hook context) */
  manager: IIgniterCollectionsManager;
  telemetry?: IgniterTelemetryManager<IgniterCollectionTelemetryEventsType>;
  logger?: IgniterLogger;
  globalHooks?: IgniterCollectionModelHooks<TSchema>;
  parentId?: string;
}

/**
 * Collection manager implementing CRUD operations.
 *
 * @typeParam TSchema - Document schema type
 */
export class IgniterCollectionModelManager<
  TSchema extends Record<string, any> = Record<string, any>,
  TViews extends Record<string, IgniterCollectionViewDefinition> = Record<
    string,
    IgniterCollectionViewDefinition
  >,
> implements IIgniterCollectionModel<TSchema, TViews> {
  readonly definition: IgniterCollectionModelDefinition<TSchema, TViews>;
  readonly views: IIgniterCollectionViewManager<TSchema, TViews>;
  readonly manager: IIgniterCollectionsManager;
  readonly telemetry?: IgniterTelemetryManager<IgniterCollectionTelemetryEventsType>;
  readonly basePath: string;

  private readonly adapter: IgniterCollectionAdapter;
  private readonly logger?: IgniterLogger;
  private readonly globalHooks?: IgniterCollectionModelHooks<TSchema>;
  private readonly parentId?: string;

  constructor(config: CollectionManagerConfig<TSchema, TViews>) {
    this.definition = config.definition;
    this.adapter = config.adapter;
    this.basePath = config.basePath;
    this.manager = config.manager;
    this.telemetry = config.telemetry;
    this.logger = config.logger;
    this.globalHooks = config.globalHooks;
    this.parentId = config.parentId;

    this.views = new IgniterCollectionViewManager({
      views: this.definition.views || [],
      collection: this as any,
      logger: this.logger,
    });
  }

  /**
   * Get the full path to a document.
   */
  private getDocumentPath(id: string, data: Record<string, any> = {}): string {
    const patterns = this.definition.patterns;

    // Find the best pattern based on data
    let bestPattern = patterns[0];
    for (const p of patterns) {
      const vars = IgniterCollectionPath.extractVariables(p);
      const hasAllVars = vars.every((v) => v === "id" || v === "parent_id" || data[v] !== undefined);
      if (hasAllVars && vars.length > IgniterCollectionPath.extractVariables(bestPattern).length) {
        bestPattern = p;
      }
    }

    const filename = IgniterCollectionPath.template(bestPattern, {
      id,
      parent_id: this.parentId ?? "",
      ...data,
    });

    return IgniterCollectionPath.resolve(this.basePath, filename);
  }

  /**
   * Render document content using template if defined.
   */
  private async renderContent(data: Record<string, any>, content: unknown): Promise<string> {
    if (!this.definition.template) {
      if (typeof content === "object" && content !== null) {
        throw new IgniterCollectionError({
          message: "Content must be a string when no template is defined",
          code: IGNITER_COLLECTION_ERROR_CODES.VALIDATION_ERROR,
          statusCode: 400,
        });
      }
      return String(content ?? "");
    }

    const templatePath = IgniterCollectionPath.resolve(this.basePath, this.definition.template);
    const templateRaw = await this.adapter.read(templatePath);

    if (!templateRaw) {
      throw new IgniterCollectionError({
        message: `Template not found: ${this.definition.template}`,
        code: IGNITER_COLLECTION_ERROR_CODES.DOCUMENT_NOT_FOUND,
        statusCode: 500,
      });
    }

    const template = Handlebars.compile(templateRaw);
    return template({ ...data, content });
  }

  /**
   * Validate data against schema.
   */
  private async validate(
    data: unknown
  ): Promise<TSchema> {
    if (!this.definition.schema) {
      return data as TSchema;
    }

    const schema = this.definition.schema;
    const result = await schema["~standard"].validate(data);

    if (result.issues) {
      throw new IgniterCollectionError({
        message: `Validation failed: ${result.issues.map((i) => i.message).join(", ")}`,
        code: IGNITER_COLLECTION_ERROR_CODES.VALIDATION_ERROR,
        statusCode: 400,
        details: {
          "ctx.package": "@igniter-js/collections",
          "ctx.operation": "validate",
          "ctx.collection": this.definition.name,
          issues: result.issues,
        },
      });
    }

    return result.value as TSchema;
  }

  /**
   * Parse a file into a document.
   */
  private async parseDocument(
    path: string,
    id: string
  ): Promise<IgniterCollectionDocument<TSchema>> {
    const raw = await this.adapter.read(path);

    if (raw === null) {
      throw new IgniterCollectionError({
        message: `Document not found: ${id}`,
        code: IGNITER_COLLECTION_ERROR_CODES.DOCUMENT_NOT_FOUND,
        statusCode: 404,
        details: {
          "ctx.package": "@igniter-js/collections",
          "ctx.operation": "read",
          "ctx.collection": this.definition.name,
          "ctx.document_id": id,
          "ctx.path": path,
        },
      });
    }

    try {
      const { data, content } = IgniterCollectionParser.parse(raw, path);
      const validatedData = await this.validate(data);

      return {
        id,
        ...validatedData,
        content,
        path,
        parentId: this.parentId,
      } as IgniterCollectionDocument<TSchema>;
    } catch (error) {
      if (error instanceof IgniterCollectionError) throw error;

      throw new IgniterCollectionError({
        message: `Failed to parse document: ${id}`,
        code: IGNITER_COLLECTION_ERROR_CODES.PARSE_ERROR,
        statusCode: 500,
        cause: error instanceof Error ? error : undefined,
        details: {
          "ctx.package": "@igniter-js/collections",
          "ctx.operation": "parse",
          "ctx.collection": this.definition.name,
          "ctx.document_id": id,
          "ctx.path": path,
        },
      });
    }
  }

  /**
   * Serialize a document to markdown.
   */
  private serializeDocument(doc: IgniterCollectionDocument<TSchema>): string {
    const { id, path, content, parentId, _search, ...frontmatter } = doc as any;
    return IgniterCollectionParser.serialize(frontmatter, content as string, path);
  }

  /**
   * Create a new document.
   *
   * @param args - Creation arguments
   * @returns The created document
   * @throws IgniterCollectionError - If validation fails or hook cancels creation
   */
  async create<TArgs extends IgniterCollectionCreateArgs<TSchema>>(
    args: TArgs
  ): Promise<IgniterCollectionDocument<TSchema, TArgs extends { select: infer S } ? S : undefined, TArgs extends { exclude: infer E } ? E : undefined>> {
    const startTime = Date.now();

    // Generate ID if not provided
    const id = args.id ?? this.definition.defaultIdGenerator();
    const { content = "", ...frontmatter } = args.data as any;

    // Validate frontmatter
    const validatedData = await this.validate(frontmatter);

    // Render content if template is defined
    const renderedContent = await this.renderContent(validatedData as Record<string, any>, content);

    // Build document
    const path = this.getDocumentPath(id, validatedData as Record<string, any>);
    let doc = {
      id,
      ...validatedData,
      content: renderedContent,
      path,
      parentId: this.parentId,
    } as any;

    // Execute hooks
    const hooks = this.definition.hooks;
    if (hooks.onCreated) {
      const result = await hooks.onCreated({
        value: doc as any,
        collection: this as any,
        manager: this.manager,
      });

      if (result === false) {
        throw new IgniterCollectionError({
          message: "Document creation cancelled by hook",
          code: IGNITER_COLLECTION_ERROR_CODES.HOOK_CANCELLED,
          statusCode: 400,
          details: {
            "ctx.package": "@igniter-js/collections",
            "ctx.operation": "create",
            "ctx.collection": this.definition.name,
            "ctx.document_id": id,
          },
        });
      }

      doc = result;
    }

    // Write file
    const content_serialized = this.serializeDocument(doc);
    await this.adapter.write(path, content_serialized);

    this.logger?.debug(`Document created: ${this.definition.name}/${id}`, {
      duration: Date.now() - startTime,
    });

    // Emit events
    await this.manager.emit("created", {
      collection: this.definition.name,
      value: doc as any,
    });

    await this.manager.emit(`${this.definition.name}:created`, {
      value: doc,
    });

    return this.applySelectAndExclude({
      doc,
      select: args.select,
      exclude: args.exclude,
    });
  }

  /**
   * Find a unique document by ID.
   *
   * @param args - Search arguments
   * @returns The document or null if not found
   * @throws IgniterCollectionError - If document exists but parsing fails
   */
  async findUnique<TArgs extends IgniterCollectionFindUniqueArgs<TSchema>>(
    args: TArgs
  ): Promise<IgniterCollectionDocument<TSchema, TArgs extends { select: infer S } ? S : undefined, TArgs extends { exclude: infer E } ? E : undefined> | null> {
    const result = await this.findMany({
      where: args.where,
      include: args.include,
      exclude: args.exclude
    });

    let doc = result[0]

    if (!doc) {
      return null;
    }

    // Execute hooks
    const hooks = this.definition.hooks;
    if (hooks.onRead) {
      const result = await hooks.onRead({
        value: doc as any,
        collection: this as any,
        manager: this.manager,
      });

      if (result === false) {
        return null;
      }

      doc = result as any;
    }

    // Emit events
    await this.manager.emit("read", {
      collection: this.definition.name,
      value: doc as any,
    });

    await this.manager.emit(`${this.definition.name}:read`, {
      value: doc,
    });

    // Apply Select/Exclude
    return this.applySelectAndExclude({
      doc,
      select: args.select,
      exclude: args.exclude,
    });
  }

  /**
   * Find multiple documents.
   */
  async findMany<TArgs extends IgniterCollectionFindManyArgs<TSchema>>(
    args?: TArgs
  ): Promise<FindManyResult<TSchema, TArgs>> {
    const patterns = this.definition.patterns;
    const allFiles = new Set<string>();

    // Collect all files from all patterns
    for (const pattern of patterns) {
      const globPattern = pattern.replace(/\{[^}]+\}/g, "*");
      const files = await this.adapter.list(this.basePath, globPattern);
      files.forEach((f) => allFiles.add(f));
    }

    // Parse all documents
    const docs: FindManyResult<TSchema, TArgs> = [];
    for (const filePath of allFiles) {
      // Find matching pattern to extract variables
      let extractedVars: Record<string, string> | null = null;
      let matchingPattern = "";

      for (const pattern of patterns) {
        extractedVars = IgniterCollectionPath.extract(pattern, filePath);
        if (extractedVars) {
          matchingPattern = pattern;
          break;
        }
      }

      if (!extractedVars) continue;

      const id = extractedVars.id || extractedVars[Object.keys(extractedVars)[0]];
      if (!id) continue;

      try {
        const doc = await this.parseDocument(filePath, id);

        // @ts-expect-error - Expected
        // Merge variables extracted from path into document root
        Object.assign(doc, extractedVars);

        // @ts-expect-error - Expected
        docs.push(doc);
      } catch {
        // Skip invalid documents
        this.logger?.warn(`Failed to parse document: ${filePath}`);
      }
    }

    // Apply filters
    let result = docs;
    if (args?.where) {
      // @ts-expect-error - Expected
      result = this.applyFilters(result, args.where);

      // Apply search if requested
      if (args.where.search) {
        // @ts-expect-error - Expected
        result = this.applySearch(result, args.where.search);
      }
    }

    // Apply sorting
    if (args?.orderBy) {
      // @ts-expect-error - Expected
      result = this.applySorting(result, args.orderBy);
    } else if (args?.where?.search) {
      // Default to sorting by relevance if search was performed and no order specified
      result = result.sort((a, b) => (b._search?.score ?? 0) - (a._search?.score ?? 0));
    }

    // Apply pagination
    if (args?.skip) {
      result = result.slice(args.skip);
    }
    if (args?.take) {
      result = result.slice(0, args.take);
    }

    // Apply Select/Exclude
    if (args?.select || args?.exclude) {
      result = result.map((doc) =>
        this.applySelectAndExclude({
          doc,
          select: args.select,
          exclude: args.exclude
        })
      );
    }

    // Execute hooks
    const hooks = this.definition.hooks;
    if (hooks.onList) {
      const hookResult = await hooks.onList({
        values: result as any,
        collection: this as any,
        manager: this.manager,
      });

      if (hookResult === false) {
        return [];
      }

      // @ts-expect-error - Expected
      result = hookResult;
    }

    return result as any;
  }

  /**
   * Update a document.
   *
   * @param args - Update arguments
   * @returns The updated document
   * @throws IgniterCollectionError - If document not found, validation fails, or hook cancels update
   */
  async update<TArgs extends IgniterCollectionUpdateArgs<TSchema>>(
    args: TArgs
  ): Promise<IgniterCollectionDocument<TSchema, TArgs extends { select: infer S } ? S : undefined, TArgs extends { exclude: infer E } ? E : undefined>> {
    const { id } = args.where;

    // Read existing
    const existing = await this.findUnique({ where: { id } });
    if (!existing) {
      throw new IgniterCollectionError({
        message: `Document not found: ${id}`,
        code: IGNITER_COLLECTION_ERROR_CODES.DOCUMENT_NOT_FOUND,
        statusCode: 404,
        details: {
          "ctx.package": "@igniter-js/collections",
          "ctx.operation": "update",
          "ctx.collection": this.definition.name,
          "ctx.document_id": id,
        },
      });
    }

    // Merge data
    const { content, ...frontmatter } = args.data;

    // Extract current frontmatter from existing document (excluding system fields)
    const { id: _id, path: _path, content: _content, parentId: _parentId, _search, ...currentFrontmatter } = existing as any;

    const mergedData = {
      ...currentFrontmatter,
      ...frontmatter,
    };

    // Validate
    const validatedData = await this.validate(mergedData);

    // @ts-expect-error - Expected
    // Render content if template is defined (use new content if provided, else existing)
    const contentToRender = content !== undefined ? content : existing.content;
    const renderedContent = await this.renderContent(validatedData as Record<string, any>, contentToRender);

    // Build document (path might change if frontmatter variables changed)
    const path = this.getDocumentPath(id, validatedData as Record<string, any>);

    let doc = {
      id,
      ...validatedData,
      content: renderedContent,
      path,
      parentId: this.parentId,
    } as any;

    // Execute hooks
    const hooks = this.definition.hooks;
    if (hooks.onUpdated) {
      const result = await hooks.onUpdated({
        newValue: doc as any,
        previousValue: existing as any,
        collection: this as any,
        manager: this.manager,
      });

      if (result === false) {
        throw new IgniterCollectionError({
          message: "Document update cancelled by hook",
          code: IGNITER_COLLECTION_ERROR_CODES.HOOK_CANCELLED,
          statusCode: 400,
          details: {
            "ctx.package": "@igniter-js/collections",
            "ctx.operation": "update",
            "ctx.collection": this.definition.name,
            "ctx.document_id": id,
          },
        });
      }

      doc = result;
    }

    // Write file
    await this.adapter.write(path, this.serializeDocument(doc));

    // Emit global event
    await this.manager.emit("updated", {
      collection: this.definition.name,
      newValue: doc as any,
      previousValue: existing as any,
    });

    // Emit collection-specific event
    await this.manager.emit(`${this.definition.name}:updated`, {
      newValue: doc,
      previousValue: existing as any,
    });

    // Apply select and exclude
    return this.applySelectAndExclude({
      doc,
      select: args.select,
      exclude: args.exclude
    });
  }

  /**
   * Delete a document.
   *
   * @param args - Deletion arguments
   * @returns The deleted document
   * @throws IgniterCollectionError - If document not found or hook cancels deletion
   */
  async delete<TArgs extends IgniterCollectionDeleteArgs<TSchema>>(
    args: TArgs
  ): Promise<IgniterCollectionDocument<TSchema, TArgs extends { select: infer S } ? S : undefined, TArgs extends { exclude: infer E } ? E : undefined>> {
    const { id } = args.where;

    // Read existing
    const existing = await this.findUnique({ where: { id } });
    if (!existing) {
      throw new IgniterCollectionError({
        message: `Document not found: ${id}`,
        code: IGNITER_COLLECTION_ERROR_CODES.DOCUMENT_NOT_FOUND,
        statusCode: 404,
        details: {
          "ctx.package": "@igniter-js/collections",
          "ctx.operation": "delete",
          "ctx.collection": this.definition.name,
          "ctx.document_id": id,
        },
      });
    }

    // Execute hooks
    const hooks = this.definition.hooks;
    if (hooks.onDeleted) {
      const result = await hooks.onDeleted({
        value: existing as any,
        collection: this as any,
        manager: this.manager,
      });

      if (result === false) {
        throw new IgniterCollectionError({
          message: "Document deletion cancelled by hook",
          code: IGNITER_COLLECTION_ERROR_CODES.HOOK_CANCELLED,
          statusCode: 400,
          details: {
            "ctx.package": "@igniter-js/collections",
            "ctx.operation": "delete",
            "ctx.collection": this.definition.name,
            "ctx.document_id": id,
          },
        });
      }
    }

    // @ts-expect-error - Delete file
    await this.adapter.delete(existing.path);

    // Emit global event
    await this.manager.emit("deleted", {
      collection: this.definition.name,
      value: existing as any,
    });

    // Emit collection-specific event
    await this.manager.emit(`${this.definition.name}:deleted`, {
      value: existing as any,
    });

    // Apply select and exclude
    return this.applySelectAndExclude({
      doc: existing,
      select: args.select,
      exclude: args.exclude
    });
  }

  /**
   * Count documents.
   */
  async count(args?: IgniterCollectionCountArgs<TSchema>): Promise<number> {
    const docs = await this.findMany({ where: args?.where });
    return docs.length;
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  /**
   * Get a nested value from an object using dot notation.
   *
   * @param obj - The object to traverse
   * @param path - Dot-separated path (e.g., "author.social.twitter")
   * @returns The value at the path, or undefined if not found
   *
   * @example
   * ```typescript
   * const obj = { author: { social: { twitter: "@john" } } };
   * getNestedValue(obj, "author.social.twitter"); // "@john"
   * getNestedValue(obj, "author.name"); // undefined
   * ```
   */
  private getNestedValue(obj: unknown, path: string): unknown {
    const parts = path.split(".");
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  /**
   * Apply array filter operators to an array value.
   *
   * @param value - The array value from the document
   * @param ops - The array filter operators to apply
   * @returns True if the value matches all operators, false otherwise
   */
  private matchesArrayOperators(
    value: unknown[],
    ops: Record<string, unknown>
  ): boolean {
    // has: array contains this value
    if (ops.has !== undefined && !value.includes(ops.has)) {
      return false;
    }

    // hasEvery: array contains ALL of these values
    if (ops.hasEvery !== undefined) {
      const required = ops.hasEvery as unknown[];
      if (!required.every((v) => value.includes(v))) {
        return false;
      }
    }

    // hasSome: array contains at least ONE of these values
    if (ops.hasSome !== undefined) {
      const candidates = ops.hasSome as unknown[];
      if (!candidates.some((v) => value.includes(v))) {
        return false;
      }
    }

    // isEmpty: array is empty (true) or not empty (false)
    if (ops.isEmpty !== undefined) {
      const isEmpty = value.length === 0;
      if (isEmpty !== ops.isEmpty) {
        return false;
      }
    }

    // length: array length equals this value
    if (ops.length !== undefined && value.length !== ops.length) {
      return false;
    }

    return true;
  }

  /**
   * Apply scalar filter operators to a value.
   *
   * @param value - The value from the document
   * @param ops - The scalar filter operators to apply
   * @returns True if the value matches all operators, false otherwise
   */
  private matchesScalarOperators(
    value: unknown,
    ops: Record<string, unknown>
  ): boolean {
    // equals: exact match
    if (ops.equals !== undefined && value !== ops.equals) {
      return false;
    }

    // not: not equal
    if (ops.not !== undefined && value === ops.not) {
      return false;
    }

    // in: value in array
    if (ops.in !== undefined && !(ops.in as unknown[]).includes(value)) {
      return false;
    }

    // notIn: value not in array
    if (ops.notIn !== undefined && (ops.notIn as unknown[]).includes(value)) {
      return false;
    }

    // lt: less than
    if (ops.lt !== undefined && !((value as number) < (ops.lt as number))) {
      return false;
    }

    // lte: less than or equal
    if (ops.lte !== undefined && !((value as number) <= (ops.lte as number))) {
      return false;
    }

    // gt: greater than
    if (ops.gt !== undefined && !((value as number) > (ops.gt as number))) {
      return false;
    }

    // gte: greater than or equal
    if (ops.gte !== undefined && !((value as number) >= (ops.gte as number))) {
      return false;
    }

    // String operators
    if (typeof value === "string") {
      // contains: substring match
      if (ops.contains !== undefined && !value.includes(ops.contains as string)) {
        return false;
      }

      // startsWith: prefix match
      if (ops.startsWith !== undefined && !value.startsWith(ops.startsWith as string)) {
        return false;
      }

      // endsWith: suffix match
      if (ops.endsWith !== undefined && !value.endsWith(ops.endsWith as string)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Apply filters to a list of documents.
   *
   * Supports:
   * - Direct field filters
   * - Filter operators (equals, not, in, lt, gt, contains, etc.)
   * - Nested field access via dot notation
   * - Array operators (has, hasEvery, hasSome, isEmpty, length)
   */
  private applyFilters(
    docs: IgniterCollectionDocument<TSchema>[],
    where: IgniterCollectionWhereClause<TSchema>
  ): IgniterCollectionDocument<TSchema>[] {
    return docs.filter((doc) => {
      for (const [key, condition] of Object.entries(where)) {
        // Skip search filter (handled separately)
        if (key === "search") continue;

        // Get value - support dot notation for nested fields
        const value = this.getNestedValue(doc, key);

        // Handle filter operators
        if (typeof condition === "object" && condition !== null) {
          const ops = condition as Record<string, unknown>;

          // Check if this is an array value with array operators
          if (Array.isArray(value)) {
            // Check array-specific operators first
            if (!this.matchesArrayOperators(value, ops)) {
              return false;
            }
            // Also check scalar operators that might apply
            if (!this.matchesScalarOperators(value, ops)) {
              return false;
            }
          } else {
            // Scalar value - apply scalar operators
            if (!this.matchesScalarOperators(value, ops)) {
              return false;
            }
          }
        } else {
          // Direct equality check
          if (value !== condition) {
            return false;
          }
        }
      }
      return true;
    });
  }

  private applySorting(
    docs: IgniterCollectionDocument<TSchema>[],
    orderBy: Record<string, "asc" | "desc" | undefined>
  ): IgniterCollectionDocument<TSchema>[] {
    return [...docs].sort((a, b) => {
      for (const [key, direction] of Object.entries(orderBy)) {
        const aVal = (a as Record<string, unknown>)[key];
        const bVal = (b as Record<string, unknown>)[key];

        if (aVal === bVal) continue;

        const cmp = (aVal as string | number) < (bVal as string | number) ? -1 : 1;
        return direction === "asc" ? cmp : -cmp;
      }
      return 0;
    });
  }

  /**
   * Recursively flatten an object or array into a searchable string.
   */
  private flattenValue(val: unknown): string {
    if (val === null || val === undefined) return "";
    if (typeof val === "string") return val;
    if (typeof val === "number" || typeof val === "boolean") return String(val);

    if (Array.isArray(val)) {
      return val.map((v) => this.flattenValue(v)).join(" ");
    }

    if (typeof val === "object") {
      return Object.values(val)
        .map((v) => this.flattenValue(v))
        .join(" ");
    }

    return "";
  }

  /**
   * Apply select and exclude filters to a document.
   */
  private applySelectAndExclude<T = unknown>(
    args: {
      doc: T,
      select?: Record<string, any>,
      exclude?: Record<string, any>
    }
  ): any {
    const { doc, select, exclude } = args;
    if (!select && !exclude) return doc;

    if (select && exclude) {
      throw new IgniterCollectionError({
        message: "Cannot use 'select' and 'exclude' at the same time",
        code: IGNITER_COLLECTION_ERROR_CODES.VALIDATION_ERROR,
        statusCode: 400,
      });
    }

    /**
     * Recursively pick fields from an object.
     */
    const pickDeep = (target: any, selection: any): any => {
      if (selection === true) return target;
      if (typeof selection !== "object" || selection === null || typeof target !== "object" || target === null) return undefined;

      const result: any = {};
      for (const [key, value] of Object.entries(selection)) {
        if (key in target) {
          const picked = pickDeep(target[key], value);
          if (picked !== undefined) {
            result[key] = picked;
          }
        }
      }
      return result;
    };

    /**
     * Recursively omit fields from an object.
     */
    const omitDeep = (target: any, exclusion: any): any => {
      if (exclusion === true) return undefined;
      if (typeof exclusion !== "object" || exclusion === null || typeof target !== "object" || target === null) return target;

      const result: any = Array.isArray(target) ? [] : { ...target };
      for (const [key, value] of Object.entries(exclusion)) {
        if (key in result) {
          if (value === true) {
            delete result[key];
          } else {
            result[key] = omitDeep(result[key], value);
          }
        }
      }
      return result;
    };

    if (select) {
      return pickDeep(doc, select);
    }

    if (exclude) {
      return omitDeep(doc, exclude);
    }

    return doc;
  }

  /**
   * Apply full-text search to a list of documents.
   */
  private applySearch(
    docs: IgniterCollectionDocument<TSchema>[],
    search: IgniterCollectionSearchFilter<TSchema>
  ): IgniterCollectionDocument<TSchema>[] {
    const { term, fields, threshold = 0.1, fuzzy: globalFuzzy } = search;
    const terms = (Array.isArray(term) ? term : [term]).map((t) => t.toLowerCase());

    const defaultFields = {
      title: { weight: 2, fuzzy: globalFuzzy ?? true },
      description: { weight: 1.5, fuzzy: globalFuzzy ?? true },
      tags: { weight: 1, fuzzy: globalFuzzy ?? false },
      content: { weight: 1, fuzzy: globalFuzzy ?? true },
    };

    const searchFieldsConfig = fields && Object.keys(fields).length > 0 ? fields : defaultFields;

    const levenshtein = (a: string, b: string): number => {
      if (a === b) return 0;
      if (a.length === 0) return b.length;
      if (b.length === 0) return a.length;

      const v0 = new Array(b.length + 1);
      const v1 = new Array(b.length + 1);

      for (let i = 0; i <= b.length; i++) v0[i] = i;

      for (let i = 0; i < a.length; i++) {
        v1[0] = i + 1;
        for (let j = 0; j < b.length; j++) {
          const cost = a[i] === b[j] ? 0 : 1;
          v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
        }
        for (let j = 0; j <= b.length; j++) v0[j] = v1[j];
      }
      return v0[b.length];
    };

    const fuzzySearchMatch = (text: string, term: string, fuzzy: boolean): number => {
      const a = text.toLowerCase();
      const b = term.toLowerCase();
      if (a.includes(b)) return 1;

      if (!fuzzy) return 0;

      // Extract alphanumeric words
      const words = a.split(/[\s,.-]+/).filter((w) => w.length > 0);
      let maxSim = 0;

      // Calculate levenshtein distance on closely sized words
      for (const word of words) {
        if (Math.abs(word.length - b.length) > 3) continue;
        const dist = levenshtein(word, b);

        // Strict fuzzy limit
        const maxDist = Math.min(3, Math.ceil(b.length * 0.3));
        if (dist > maxDist) continue;

        const sim = 1 - (dist / Math.max(word.length, b.length));
        if (sim > maxSim) maxSim = sim;
        if (maxSim === 1) break;
      }

      // Also check the entire string if it's reasonably small
      if (a.length > 0 && a.length <= 100) {
        const distFull = levenshtein(a, b);
        const maxDist = Math.min(3, Math.ceil(b.length * 0.3));
        if (distFull <= maxDist) {
          const simFull = 1 - (distFull / Math.max(a.length, b.length));
          if (simFull > maxSim) maxSim = simFull;
        }
      }

      return maxSim;
    };

    type SearchFieldContext = {
      value: string;
      path: string;
      weight: number;
      fuzzy: boolean;
    };

    const extractFieldsToSearch = (docValue: any, fieldsConfig: any, currentPath: string): SearchFieldContext[] => {
      if (!fieldsConfig || typeof fieldsConfig !== "object") return [];
      if (docValue === null || docValue === undefined) return [];

      const contexts: SearchFieldContext[] = [];

      for (const [key, config] of Object.entries(fieldsConfig)) {
        if (!config) continue;

        const nextPath = currentPath ? `${currentPath}.${key}` : key;
        const isFieldDef = typeof config === "object" && ("weight" in config || "fuzzy" in config);
        const docProp = docValue[key];

        if (isFieldDef) {
          if (docProp !== undefined && docProp !== null) {
            const conf = config as { weight?: number; fuzzy?: boolean };
            const weight = typeof conf.weight === "number" ? conf.weight : 1;
            const fuzzy = typeof conf.fuzzy === "boolean" ? conf.fuzzy : (globalFuzzy ?? true);

            if (Array.isArray(docProp)) {
              for (let i = 0; i < docProp.length; i++) {
                if (docProp[i] !== undefined && docProp[i] !== null) {
                  const val = typeof docProp[i] === "object" ? this.flattenValue(docProp[i]) : String(docProp[i]);
                  contexts.push({
                    value: val,
                    path: `${nextPath}[${i}]`,
                    weight,
                    fuzzy,
                  });
                }
              }
            } else if (typeof docProp === "object") {
              // Support matching deeply nested values stringified
              contexts.push({
                value: this.flattenValue(docProp),
                path: nextPath,
                weight,
                fuzzy,
              });
            } else {
              contexts.push({
                value: String(docProp),
                path: nextPath,
                weight,
                fuzzy,
              });
            }
          }
        } else if (typeof config === "object") {
          contexts.push(...extractFieldsToSearch(docProp, config, nextPath));
        }
      }
      return contexts;
    };

    const results = docs.map((doc) => {
      const contexts = extractFieldsToSearch(doc, searchFieldsConfig, "");
      let score = 0;
      const matches = new Set<string>();

      for (const t of terms) {
        let termScore = 0;

        for (const ctx of contexts) {
          if (!ctx.value) continue;

          const sim = fuzzySearchMatch(ctx.value, t, ctx.fuzzy);
          if (sim >= 0.1) {
            matches.add(ctx.path);
          }

          if (sim > 0) {
            termScore += sim * ctx.weight;
          }
        }

        score += termScore;
      }

      const normalizedScore = terms.length > 0 ? score / terms.length : 0;

      return {
        ...doc as any,
        _search: {
          score: Math.round(normalizedScore * 100) / 100,
          matches: Array.from(matches),
        },
      };
    });

    return results.filter((r) => (r._search?.score ?? 0) >= threshold);
  }
}
