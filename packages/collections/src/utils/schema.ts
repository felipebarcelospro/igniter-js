import Ajv, { Schema as JSONSchema } from "ajv";
import type { StandardJSONSchemaV1, StandardSchemaV1 } from "@standard-schema/spec";

// Inicializando o motor de validação para JSON Schema
const ajv = new Ajv({ allErrors: true, useDefaults: true, strict: false });

/**
 * Tipos utilitários para extrair Input e Output de qualquer um dos dois padrões
 */
type InferIn<T> = T extends StandardSchemaV1 ? StandardSchemaV1.InferInput<T> : unknown;
type InferOut<T> = T extends StandardSchemaV1 ? StandardSchemaV1.InferOutput<T> : any;

export class StdSchema<
  TSchema extends StandardSchemaV1 | JSONSchema,
  TInput = InferIn<TSchema>,
  TOutput = InferOut<TSchema>
> {
  private schema: TSchema;
  private ajvValidate?: any;

  constructor(schema: TSchema) {
    this.schema = schema;
    
    // @ts-expect-error - Se não for StandardSchemaV1, compilamos como JSON Schema via Ajv
    if (!("~standard" in schema)) {
      this.ajvValidate = ajv.compile(schema as JSONSchema);
    }
  }

  static create<
    const TSchema extends StandardSchemaV1 | JSONSchema,
  >(schema: TSchema): StdSchema<TSchema> {
    return new StdSchema(schema);
  }

  static validate<
    const TSchema extends StandardSchemaV1 | JSONSchema,
    TInput = InferIn<TSchema>,
    TOutput = InferOut<TSchema>
  >(schema: TSchema, data: TInput): Promise<StandardSchemaV1.Result<TOutput>> {
    const instance = new StdSchema<TSchema, TInput, TOutput>(schema);
    return instance.validate(data);
  }

  static parse<
    const TSchema extends StandardSchemaV1 | JSONSchema,
    TInput = InferIn<TSchema>,
    TOutput = InferOut<TSchema>
  >(schema: TSchema, data: TInput): Promise<TOutput> {
    const instance = new StdSchema<TSchema, TInput, TOutput>(schema);
    return instance.parse(data);
  }

  static safeParse<
    const TSchema extends StandardSchemaV1 | JSONSchema,
    TInput = InferIn<TSchema>,
    TOutput = InferOut<TSchema>
  >(schema: TSchema, data: TInput): Promise<{ success: true; data: TOutput } | { success: false; errors: StandardSchemaV1.Issue[] }> {
    const instance = new StdSchema<TSchema, TInput, TOutput>(schema);
    return instance.safeParse(data);
  }

  static isValid<
    const TSchema extends StandardSchemaV1 | JSONSchema,
    TInput = InferIn<TSchema>,
  >(schema: TSchema, data: TInput): Promise<TInput extends InferIn<TSchema> ? true : false> {
    const instance = new StdSchema<TSchema, TInput>(schema);
    return instance.isValid(data) as Promise<TInput extends InferIn<TSchema> ? true : false>;
  }

  static getIssues<
    const TSchema extends StandardSchemaV1 | JSONSchema,
    TInput = InferIn<TSchema>,
  >(schema: TSchema, data: TInput): Promise<string[] | null> {
    const instance = new StdSchema<TSchema, TInput>(schema);
    return instance.getIssues(data);
  }

  static getJSONSchema<
    const TSchema extends StandardSchemaV1 | JSONSchema,
  >(schema: TSchema): StandardJSONSchemaV1 {
    // @ts-expect-error - Apenas StandardSchemaV1 tem método para converter para JSON Schema
    if ("toJSONSchema" in schema) {
      return schema.toJSONSchema();
    }

    return schema as StandardJSONSchemaV1;
  }

  static async getStandardSchema<
    const TSchema extends StandardSchemaV1 | JSONSchema,
  >(schema: TSchema): Promise<StandardSchemaV1> {
    // @ts-expect-error - Caso 1: StandardSchemaV1 (Zod, Valibot, etc)
    if ("~standard" in schema) {
      return schema as StandardSchemaV1;
    }

    // Caso 2: JSON Schema Real com Ajv
    const compiled = ajv.compile(schema as JSONSchema);
    return {
      // @ts-ignore - Ajuste de tipos para compatibilidade
      ...schema,
      "~standard": {
        validate: async (data: unknown) => {
          const valid = compiled(data);
          if (valid) {
            return { value: data, issues: undefined};
          }

          return {
            issues: compiled.errors?.map((err: any) => ({ 
              path: [err.instancePath],
              message: err.message || "Validation error",
            })),
          };
        },
      },
    };
  }

  /**
   * O core de validação que unifica os dois mundos.
   */
  async validate(data: TInput): Promise<StandardSchemaV1.Result<TOutput>> {
    // @ts-expect-error - Caso 1: StandardSchemaV1 (Zod, Valibot, etc)
    if ("~standard" in this.schema) {
      const result = this.schema["~standard"].validate(data);
      return result instanceof Promise ? await result : result;
    }

    // Caso 2: JSON Schema Real com Ajv
    const valid = this.ajvValidate!(data);
    if (valid) {
      return { value: data as unknown as TOutput };
    }

    return {
      issues: this.ajvValidate!.errors?.map((err: any) => ({
        path: [err.instancePath],
        message: err.message || "Validation error",
      })),
    };
  }

  /**
   * Parse estrito: Retorna o dado tipado ou lança erro.
   */
  async parse(data: TInput): Promise<TOutput> {
    const result = await this.validate(data);
    if (result.issues) {
      // @ts-expect-error - result.issues is defined here
      const errorMsg = result.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
      throw new Error(`[SchemaAdapter Error]: ${errorMsg}`);
    }
    return result.value;
  }

  /**
   * Safe Parse: Retorna um objeto com status, evitando try/catch no código principal.
   */
  async safeParse(data: TInput): Promise<{ success: true; data: TOutput } | { success: false; errors: StandardSchemaV1.Issue[] }> {
    const result = await this.validate(data);
    // @ts-expect-error - result.issues is defined here
    if (result.issues) return { success: false, errors: result.issues };
    return { success: true, data: result.value };
  }

  /**
   * Type Guard: Verifica se o dado é válido e já tipa a variável no escopo seguinte.
   */
  async isValid<TData = unknown>(data: TData): Promise<TData extends TInput ? true : false> {
    const result = await this.validate(data as unknown as TInput);
    return !result.issues as TData extends TInput ? true : false;
  }

  /**
   * Método Utilitário: Retorna apenas as mensagens de erro formatadas.
   */
  async getIssues(data: TInput): Promise<string[] | null> {
    const result = await this.validate(data);
    return result.issues ? result.issues.map(i => i.message) : null;
  }
}