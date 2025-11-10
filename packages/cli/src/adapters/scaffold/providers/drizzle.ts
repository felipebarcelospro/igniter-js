import * as fs from 'fs/promises';
import * as path from 'path';
import { createChildLogger } from '../../logger';
import { ModelSchema, SchemaProvider, SchemaProviderField } from './base';

const logger = createChildLogger({ component: 'drizzle-provider' });

/**
 * Maps Drizzle data types to standard TypeScript types.
 * @param drizzleType The type from the Drizzle schema.
 * @returns The corresponding TypeScript type as a string.
 */
function mapDrizzleTypeToTsType(drizzleType: string): string {
  // Common Drizzle types
  if (drizzleType.includes('varchar') || drizzleType.includes('text') || drizzleType.includes('char')) {
    return 'string';
  }
  if (drizzleType.includes('int') || drizzleType.includes('serial') || drizzleType.includes('smallint') || drizzleType.includes('bigint')) {
    return 'number';
  }
  if (drizzleType.includes('boolean')) {
    return 'boolean';
  }
  if (drizzleType.includes('timestamp') || drizzleType.includes('date')) {
    return 'Date';
  }
  if (drizzleType.includes('json')) {
    return 'any';
  }
  if (drizzleType.includes('decimal') || drizzleType.includes('real') || drizzleType.includes('double')) {
    return 'number';
  }
  
  // Default to string for unknown types
  return 'string';
}

/**
 * Implements the SchemaProvider interface for Drizzle ORM.
 * This class is responsible for reading Drizzle schema files and translating
 * them into a standardized, ORM-agnostic format for the CLI.
 */
export class DrizzleProvider implements SchemaProvider {
  private schemaPath: string;

  constructor(customPath?: string) {
    // Common Drizzle schema locations
    const possiblePaths = [
      customPath,
      path.join(process.cwd(), 'src', 'db', 'schema.ts'),
      path.join(process.cwd(), 'src', 'schema.ts'),
      path.join(process.cwd(), 'drizzle', 'schema.ts'),
      path.join(process.cwd(), 'db', 'schema.ts'),
    ].filter(Boolean) as string[];

    this.schemaPath = possiblePaths[0];
    logger.debug(`Drizzle schema path set to: ${this.schemaPath}`);
  }

  /**
   * Reads and parses the Drizzle schema file to extract the details of a specific table/model.
   *
   * @param modelName - The name of the table/model to retrieve (e.g., 'users', 'posts').
   * @returns A promise that resolves to the standardized `ModelSchema` or null if not found.
   */
  public async getModel(modelName: string): Promise<ModelSchema | null> {
    try {
      // Try to find the schema file
      const schemaPath = await this.findSchemaFile();
      if (!schemaPath) {
        logger.error('Drizzle schema file not found');
        return null;
      }

      const schemaContent = await fs.readFile(schemaPath, 'utf-8');
      
      // Simple parsing approach - look for table definitions
      // This is a basic implementation that looks for common Drizzle table patterns
      const tablePattern = new RegExp(
        `export\\s+const\\s+${modelName}\\s*=\\s*(?:pgTable|mysqlTable|sqliteTable)\\s*\\([^)]+\\)\\s*=>\\s*\\(\\s*\\{([^}]+)\\}`,
        'gs'
      );
      
      const match = tablePattern.exec(schemaContent);
      
      if (!match) {
        logger.warn(`Table '${modelName}' not found in Drizzle schema.`);
        return null;
      }

      // Parse fields from the table definition
      const fieldsContent = match[1];
      const fields: SchemaProviderField[] = this.parseFields(fieldsContent);

      return {
        name: this.toPascalCase(modelName),
        fields,
      };

    } catch (error) {
      logger.error('Failed to parse Drizzle schema', { error });
      throw new Error(`Could not process Drizzle schema. Make sure the schema file exists and is valid.`);
    }
  }

  /**
   * Lists all available table names in the Drizzle schema.
   *
   * @returns A promise that resolves to an array of table names.
   */
  public async listModels(): Promise<string[]> {
    try {
      const schemaPath = await this.findSchemaFile();
      if (!schemaPath) {
        logger.error('Drizzle schema file not found');
        return [];
      }

      const schemaContent = await fs.readFile(schemaPath, 'utf-8');
      
      // Look for table definitions (pgTable, mysqlTable, sqliteTable)
      const tablePattern = /export\s+const\s+(\w+)\s*=\s*(?:pgTable|mysqlTable|sqliteTable)/g;
      const tables: string[] = [];
      let match;

      while ((match = tablePattern.exec(schemaContent)) !== null) {
        tables.push(match[1]);
      }

      logger.debug(`Found ${tables.length} tables in Drizzle schema: ${tables.join(', ')}`);
      return tables;

    } catch (error) {
      logger.error('Failed to parse Drizzle schema for table listing', { error });
      return [];
    }
  }

  /**
   * Attempts to find the Drizzle schema file in common locations.
   */
  private async findSchemaFile(): Promise<string | null> {
    const possiblePaths = [
      this.schemaPath,
      path.join(process.cwd(), 'src', 'db', 'schema.ts'),
      path.join(process.cwd(), 'src', 'schema.ts'),
      path.join(process.cwd(), 'drizzle', 'schema.ts'),
      path.join(process.cwd(), 'db', 'schema.ts'),
    ];

    for (const schemaPath of possiblePaths) {
      try {
        await fs.access(schemaPath);
        return schemaPath;
      } catch {
        // Continue checking
      }
    }

    return null;
  }

  /**
   * Parses field definitions from a Drizzle table.
   */
  private parseFields(fieldsContent: string): SchemaProviderField[] {
    const fields: SchemaProviderField[] = [];
    
    // Simple field parsing - looks for common Drizzle column definitions
    const fieldLines = fieldsContent.split(/[,\n]/).filter(line => line.trim());
    
    for (const line of fieldLines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//')) continue;

      // Extract field name and type
      const fieldMatch = trimmed.match(/(\w+):\s*(\w+)(?:\([^)]*\))?/);
      if (!fieldMatch) continue;

      const [, fieldName, fieldType] = fieldMatch;
      
      // Determine field properties
      const isId = trimmed.includes('primaryKey') || trimmed.includes('.primaryKey()') || fieldName === 'id';
      const isRequired = !trimmed.includes('notNull()') && !trimmed.includes('.notNull()');
      const isUnique = trimmed.includes('unique()') || trimmed.includes('.unique()');
      const hasDefault = trimmed.includes('default(') || trimmed.includes('.default(');
      const isAutoGenerated = 
        trimmed.includes('serial') || 
        trimmed.includes('autoincrement') ||
        trimmed.includes('defaultRandom') ||
        (hasDefault && (trimmed.includes('now()') || trimmed.includes('sql`now()`')));

      fields.push({
        name: fieldName,
        type: mapDrizzleTypeToTsType(fieldType),
        isId,
        isRequired: !isRequired,
        isUnique,
        isRelation: false, // Drizzle relations are handled separately
        hasDefault,
        isAutoGenerated,
      });
    }

    return fields;
  }

  private toPascalCase(str: string): string {
    return str.replace(/(^\w|_\w)/g, g => g.replace(/_/, '').toUpperCase());
  }
}
