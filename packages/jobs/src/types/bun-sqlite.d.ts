declare module "bun:sqlite" {
  export class Database {
    constructor(filename?: string, options?: { create?: boolean });
    exec(sql: string): void;
    prepare<T = unknown>(
      sql: string,
    ): {
      run(...params: unknown[]): {
        changes: number;
        lastInsertRowid: number | bigint;
      };
      get(...params: unknown[]): T | undefined;
      all(...params: unknown[]): T[];
    };
    close(): void;
  }
}
