import { describe, it, expect, vi, beforeEach } from 'vitest';
import { promises as fs } from 'fs';
import * as ts from 'typescript';
import {
  parseASTStructure,
  analyzeTypeScriptErrors
} from './ast-parsing';

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
    access: vi.fn()
  }
}));

// Mock TypeScript ESLint parser
vi.mock('@typescript-eslint/parser', () => ({
  parse: vi.fn()
}));

// Mock FileSystemService
vi.mock('../memory/fs', () => ({
  createFileSystemService: vi.fn(() => ({
    resolveProjectRoot: vi.fn(async (dir: string) => dir),
    pathExists: vi.fn(async () => false) // Default to false - no tsconfig found
  }))
}));

describe('AST Parsing Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseASTStructure', () => {
    describe('TypeScript parsing', () => {
      it('should parse function declarations', () => {
        const content = `
          function getUserData(id: string): Promise<User> {
            return fetch(\`/api/users/\${id}\`);
          }
          
          async function createUser(userData: UserData): Promise<User> {
            return api.post('/users', userData);
          }
          
          export function publicFunction() {
            return true;
          }
        `;
        
        const result = parseASTStructure(content, 'typescript');
        
        expect(result.functions).toHaveLength(3);
        expect(result.functions[0]).toMatchObject({
          name: 'getUserData',
          parameters: ['id'],
          isAsync: false,
          isExported: false
        });
        expect(result.functions[1]).toMatchObject({
          name: 'createUser',
          parameters: ['userData'],
          isAsync: true,
          isExported: false
        });
        expect(result.functions[2]).toMatchObject({
          name: 'publicFunction',
          isExported: true
        });
      });

      it('should parse class declarations', () => {
        const content = `
          class UserService {
            private api: ApiClient;
            
            constructor(api: ApiClient) {
              this.api = api;
            }
          }
          
          export class PublicService {
            public method() {}
          }
        `;
        
        const result = parseASTStructure(content, 'typescript');
        
        expect(result.classes).toHaveLength(2);
        expect(result.classes[0]).toMatchObject({
          name: 'UserService',
          isExported: false
        });
        expect(result.classes[1]).toMatchObject({
          name: 'PublicService',
          isExported: true
        });
      });

      it('should parse interface declarations', () => {
        const content = `
          interface User {
            id: string;
            name: string;
          }
          
          export interface ApiResponse<T> {
            data: T;
            status: number;
          }
        `;
        
        const result = parseASTStructure(content, 'typescript');
        
        expect(result.interfaces).toHaveLength(2);
        expect(result.interfaces[0]).toMatchObject({
          name: 'User',
          isExported: false,
          members: 2
        });
        expect(result.interfaces[1]).toMatchObject({
          name: 'ApiResponse',
          isExported: true,
          members: 2
        });
      });

      it('should parse type aliases', () => {
        const content = `
          type UserId = string;
          export type UserRole = 'admin' | 'user' | 'guest';
        `;
        
        const result = parseASTStructure(content, 'typescript');
        
        expect(result.types).toHaveLength(2);
        expect(result.types[0]).toMatchObject({
          name: 'UserId',
          isExported: false
        });
        expect(result.types[1]).toMatchObject({
          name: 'UserRole',
          isExported: true
        });
      });

      it('should parse variable declarations', () => {
        const content = `
          const API_URL = 'https://api.example.com';
          let userData: User;
          var legacyVar = 'old';
          export const CONFIG = { debug: true };
        `;
        
        const result = parseASTStructure(content, 'typescript');
        
        expect(result.variables).toHaveLength(4);
        expect(result.variables[0]).toMatchObject({
          name: 'API_URL',
          isExported: false,
          isConst: true
        });
        expect(result.variables[3]).toMatchObject({
          name: 'CONFIG',
          isExported: true,
          isConst: true
        });
      });

      it('should parse import statements', () => {
        const content = `
          import React from 'react';
          import { useState, useEffect } from 'react';
          import type { User } from './types';
          import * as fs from 'fs';
        `;
        
        const result = parseASTStructure(content, 'typescript');
        
        expect(result.imports).toHaveLength(4);
        expect(result.imports[0]).toMatchObject({
          module: 'react',
          isTypeOnly: false
        });
        expect(result.imports[2]).toMatchObject({
          module: './types',
          isTypeOnly: true
        });
      });

      it('should parse export declarations', () => {
        const content = `
          export { Button, Modal } from './components';
          export * from './utils';
        `;
        
        const result = parseASTStructure(content, 'typescript');
        
        expect(result.exports).toHaveLength(2);
        expect(result.exports[0]).toMatchObject({
          module: './components',
          type: 're-export'
        });
        expect(result.exports[1]).toMatchObject({
          module: './utils',
          type: 're-export'
        });
      });

      it('should handle parsing errors gracefully', () => {
        const invalidContent = `
          function invalid syntax {
            missing parentheses
        `;
        
        const result = parseASTStructure(invalidContent, 'typescript');
        
        expect(result).toHaveProperty('functions');
        expect(result).toHaveProperty('errors');
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toContain('AST parsing failed');
      });
    });

    describe('JavaScript parsing', () => {
      it('should parse JavaScript with ESLint parser', async () => {
        const { parse } = await import('@typescript-eslint/parser');
        
        // Mock ESLint parser response
        vi.mocked(parse).mockReturnValue({
          body: [
            {
              type: 'FunctionDeclaration',
              id: { name: 'testFunction' },
              params: [{ name: 'param1' }],
              async: false
            },
            {
              type: 'ClassDeclaration',
              id: { name: 'TestClass' }
            },
            {
              type: 'VariableDeclaration',
              kind: 'const',
              declarations: [{ id: { name: 'testVar' } }]
            },
            {
              type: 'ImportDeclaration',
              source: { value: 'react' }
            },
            {
              type: 'ExportDefaultDeclaration'
            }
          ]
        } as any);

        const content = `
          function testFunction(param1) { }
          class TestClass { }
          const testVar = 'value';
          import React from 'react';
          export default TestClass;
        `;
        
        const result = parseASTStructure(content, 'javascript');
        
        expect(result.functions).toHaveLength(1);
        expect(result.functions[0]).toMatchObject({
          name: 'testFunction',
          parameters: ['param1'],
          isAsync: false
        });
        
        expect(result.classes).toHaveLength(1);
        expect(result.classes[0]).toMatchObject({
          name: 'TestClass'
        });
        
        expect(result.variables).toHaveLength(1);
        expect(result.variables[0]).toMatchObject({
          name: 'testVar',
          isConst: true
        });
        
        expect(result.imports).toHaveLength(1);
        expect(result.imports[0]).toMatchObject({
          module: 'react'
        });
        
        expect(result.exports).toHaveLength(1);
        expect(result.exports[0]).toMatchObject({
          type: 'default'
        });
      });

      it('should handle JSX parsing for React files', async () => {
        const { parse } = await import('@typescript-eslint/parser');
        
        vi.mocked(parse).mockReturnValue({
          body: []
        } as any);

        const content = `
          function Component() {
            return <div>Hello World</div>;
          }
        `;
        
        const result = parseASTStructure(content, 'javascript-react');
        
        expect(parse).toHaveBeenCalledWith(
          content,
          expect.objectContaining({
            ecmaFeatures: expect.objectContaining({
              jsx: true
            })
          })
        );
      });

      it('should handle ESLint parsing errors', async () => {
        const { parse } = await import('@typescript-eslint/parser');
        
        vi.mocked(parse).mockImplementation(() => {
          throw new Error('Syntax error');
        });

        const content = 'invalid javascript syntax {';
        
        const result = parseASTStructure(content, 'javascript');
        
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toContain('JavaScript parsing failed');
      });
    });

    describe('Unknown languages', () => {
      it('should return empty structure for unknown languages', () => {
        const content = 'some content';
        
        const result = parseASTStructure(content, 'unknown');
        
        expect(result).toMatchObject({
          imports: [],
          exports: [],
          functions: [],
          classes: [],
          interfaces: [],
          types: [],
          variables: [],
          errors: []
        });
      });
    });
  });

  describe('analyzeTypeScriptErrors', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should analyze TypeScript errors with default options', async () => {
      // Mock FileSystemService to say tsconfig doesn't exist
      const { createFileSystemService } = await import('../memory/fs');
      vi.mocked(createFileSystemService).mockReturnValue({
        resolveProjectRoot: vi.fn(async (dir: string) => dir),
        pathExists: vi.fn(async () => false)
      } as any);
      
      const content = `
        function test(param: unknownType): void {
          undeclaredVariable = 5;
        }
      `;
      
      const result = await analyzeTypeScriptErrors('/test.ts', content);
      
      expect(result).toHaveProperty('typescript_errors');
      expect(result).toHaveProperty('health_summary');
      expect(result.health_summary).toMatchObject({
        error_count: expect.any(Number),
        warning_count: expect.any(Number),
        overall_status: expect.any(String),
        compilable: expect.any(Boolean)
      });
    });

    it('should parse tsconfig.json when project root provided', async () => {
      // Mock FileSystemService to indicate tsconfig.json exists
      const { createFileSystemService } = await import('../memory/fs');
      vi.mocked(createFileSystemService).mockReturnValue({
        resolveProjectRoot: vi.fn(async (dir: string) => dir),
        pathExists: vi.fn(async () => true)
      } as any);
      
      const mockTsconfig = {
        compilerOptions: {
          target: 'ES2020',
          strict: true,
          skipLibCheck: true
        }
      };
      
      // Mock TypeScript config parsing
      const mockReadConfigFile = vi.spyOn(ts, 'readConfigFile');
      const mockParseJsonConfigFileContent = vi.spyOn(ts, 'parseJsonConfigFileContent');
      
      mockReadConfigFile.mockReturnValue({
        config: mockTsconfig,
        error: undefined
      });
      
      mockParseJsonConfigFileContent.mockReturnValue({
        options: mockTsconfig.compilerOptions,
        fileNames: [],
        errors: []
      } as any);
      
      const content = 'const test: string = "hello";';
      
      await analyzeTypeScriptErrors('/project/src/test.ts', content, '/project');
      
      expect(mockReadConfigFile).toHaveBeenCalledWith('/project/tsconfig.json', ts.sys.readFile);
    });

    it('should handle missing tsconfig.json gracefully', async () => {
      // Mock FileSystemService to indicate tsconfig.json doesn't exist
      const { createFileSystemService } = await import('../memory/fs');
      vi.mocked(createFileSystemService).mockReturnValue({
        resolveProjectRoot: vi.fn(async (dir: string) => dir),
        pathExists: vi.fn(async () => false)
      } as any);
      
      const content = 'const test: string = "hello";';
      
      const result = await analyzeTypeScriptErrors('/test.ts', content, '/project');
      
      expect(result).toHaveProperty('typescript_errors');
      expect(result).toHaveProperty('health_summary');
      expect(result.typescript_errors).toHaveLength(0);
      expect(result.health_summary.compilable).toBe(true);
    });

    it('should handle invalid tsconfig.json gracefully', async () => {
      // Mock FileSystemService to indicate tsconfig.json exists
      const { createFileSystemService } = await import('../memory/fs');
      vi.mocked(createFileSystemService).mockReturnValue({
        resolveProjectRoot: vi.fn(async (dir: string) => dir),
        pathExists: vi.fn(async () => true)
      } as any);
      
      const mockReadConfigFile = vi.spyOn(ts, 'readConfigFile');
      mockReadConfigFile.mockReturnValue({
        config: undefined,
        error: { messageText: 'Invalid JSON' } as any
      });
      
      const content = 'const test: string = "hello";';
      
      const result = await analyzeTypeScriptErrors('/test.ts', content, '/project');
      
      expect(result).toHaveProperty('typescript_errors');
      expect(result.typescript_errors).toHaveLength(0);
      expect(result.health_summary.compilable).toBe(true);
    });

    it('should categorize diagnostic severity correctly', async () => {
      // Mock FileSystemService to say tsconfig doesn't exist
      const { createFileSystemService } = await import('../memory/fs');
      vi.mocked(createFileSystemService).mockReturnValue({
        resolveProjectRoot: vi.fn(async (dir: string) => dir),
        pathExists: vi.fn(async () => false)
      } as any);
      
      // Create a mock that will trigger both errors and warnings
      const content = `
        // This should trigger a warning
        let unused: string;
        
        // This should trigger an error  
        let test: unknownType = 5;
      `;
      
      const result = await analyzeTypeScriptErrors('/test.ts', content);
      
      expect(result.health_summary.overall_status).toBeDefined();
      expect(['healthy', 'has_warnings', 'needs_attention']).toContain(result.health_summary.overall_status);
    });

    it('should handle analysis errors gracefully', async () => {
      // Reset the FileSystemService mock to default behavior for this test
      const { createFileSystemService } = await import('../memory/fs');
      vi.mocked(createFileSystemService).mockReturnValue({
        resolveProjectRoot: vi.fn(async (dir: string) => dir),
        pathExists: vi.fn(async () => true)
      } as any);
      
      // Mock ts.readConfigFile to throw an error
      const mockReadConfigFile = vi.spyOn(ts, 'readConfigFile');
      mockReadConfigFile.mockImplementation(() => {
        throw new Error('Config read failed');
      });
      
      const content = 'const test: string = "hello";';
      
      const result = await analyzeTypeScriptErrors('/test.ts', content);
      
      expect(result.typescript_errors).toHaveLength(1);
      expect(result.typescript_errors[0]).toMatchObject({
        severity: 'error',
        message: expect.stringContaining('Analysis failed'),
        code: 'ANALYSIS_ERROR'
      });
    });

    it('should provide detailed error information', async () => {
      // Mock FileSystemService to say tsconfig doesn't exist
      const { createFileSystemService } = await import('../memory/fs');
      vi.mocked(createFileSystemService).mockReturnValue({
        resolveProjectRoot: vi.fn(async (dir: string) => dir),
        pathExists: vi.fn(async () => false)
      } as any);
      
      const content = `
        function test(): string {
          return 123; // Type error: number is not assignable to string
        }
      `;
      
      const result = await analyzeTypeScriptErrors('/test.ts', content);
      
      if (result.typescript_errors.length > 0) {
        const error = result.typescript_errors[0];
        expect(error).toHaveProperty('severity');
        expect(error).toHaveProperty('message');
        expect(error).toHaveProperty('line');
        expect(error).toHaveProperty('column');
        expect(error).toHaveProperty('code');
      }
    });

    it('should calculate health summary correctly', async () => {
      // Mock FileSystemService to say tsconfig doesn't exist for this test
      const { createFileSystemService } = await import('../memory/fs');
      vi.mocked(createFileSystemService).mockReturnValue({
        resolveProjectRoot: vi.fn(async (dir: string) => dir),
        pathExists: vi.fn(async () => false)
      } as any);
      
      const content = 'const valid: string = "hello";';
      
      const result = await analyzeTypeScriptErrors('/test.ts', content);
      
      const errors = result.typescript_errors.filter((d: any) => d.severity === 'error').length;
      const warnings = result.typescript_errors.filter((d: any) => d.severity === 'warning').length;
      
      expect(result.health_summary.error_count).toBe(errors);
      expect(result.health_summary.warning_count).toBe(warnings);
      expect(result.health_summary.compilable).toBe(errors === 0);
      
      if (errors > 0) {
        expect(result.health_summary.overall_status).toBe('needs_attention');
      } else if (warnings > 0) {
        expect(result.health_summary.overall_status).toBe('has_warnings');
      } else {
        expect(result.health_summary.overall_status).toBe('healthy');
      }
    });
  });
});
