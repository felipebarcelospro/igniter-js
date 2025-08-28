import { describe, it, expect, vi, beforeEach } from 'vitest';
import { promises as fs } from 'fs';
import {
  extractImportsFromContent,
  extractExportsFromContent,
  resolveModulePath,
  findSymbolInFile,
  searchSymbolInProject,
  getPackageInfo,
  getPackageDependencies,
  analyzeSpecificSymbol,
  extractJSDocComment,
  traceDependencyChain
} from './code-investigation';

// Mock fs and other modules
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
    access: vi.fn()
  }
}));

vi.mock('child_process', () => ({
  execSync: vi.fn()
}));

vi.mock('./file-analysis', async () => {
  const actual = await vi.importActual('./file-analysis');
  return {
    ...actual,
    pathExists: vi.fn()
  };
});

describe('Code Investigation Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('extractImportsFromContent', () => {
    it('should extract ES6 named imports', async () => {
      const content = `
        import { Component, useState } from 'react';
        import { Button, Modal } from './components';
      `;
      
      const imports = await extractImportsFromContent(content);
      
      expect(imports).toHaveLength(2);
      expect(imports[0]).toMatchObject({
        source: 'react',
        imports: ['Component', 'useState']
      });
      expect(imports[1]).toMatchObject({
        source: './components',
        imports: ['Button', 'Modal']
      });
    });

    it('should extract default imports', async () => {
      const content = `
        import React from 'react';
        import axios from 'axios';
      `;
      
      const imports = await extractImportsFromContent(content);
      
      expect(imports).toHaveLength(2);
      expect(imports[0]).toMatchObject({
        source: 'react',
        default: 'React'
      });
      expect(imports[1]).toMatchObject({
        source: 'axios',
        default: 'axios'
      });
    });

    it('should extract namespace imports', async () => {
      const content = `
        import * as fs from 'fs';
        import * as path from 'path';
      `;
      
      const imports = await extractImportsFromContent(content);
      
      expect(imports).toHaveLength(2);
      expect(imports[0]).toMatchObject({
        source: 'fs',
        namespace: 'fs'
      });
      expect(imports[1]).toMatchObject({
        source: 'path',
        namespace: 'path'
      });
    });

    it('should extract dynamic imports', async () => {
      const content = `
        const module = await import('./dynamic-module');
        import('./another-module');
      `;
      
      const imports = await extractImportsFromContent(content);
      
      expect(imports).toHaveLength(2);
      expect(imports[0].source).toBe('./dynamic-module');
      expect(imports[1].source).toBe('./another-module');
    });

    it('should handle mixed import styles', async () => {
      const content = `
        import React, { useState, useEffect } from 'react';
        import type { User } from './types';
      `;
      
      const imports = await extractImportsFromContent(content);
      
      expect(imports).toHaveLength(2);
      expect(imports[0]).toMatchObject({
        source: 'react',
        default: 'React',
        imports: ['useState', 'useEffect']
      });
    });
  });

  describe('extractExportsFromContent', () => {
    it('should extract named exports', async () => {
      const content = `
        export const API_URL = 'https://api.example.com';
        export function getUserData() { }
        export class UserService { }
      `;
      
      const exports = await extractExportsFromContent(content);
      
      expect(exports).toHaveLength(3);
      expect(exports.map(e => e.name)).toEqual(['API_URL', 'getUserData', 'UserService']);
      expect(exports.every(e => e.type === 'named')).toBe(true);
    });

    it('should extract export lists', async () => {
      const content = `
        export { Button, Modal, Input };
        export { api as apiClient, utils };
      `;
      
      const exports = await extractExportsFromContent(content);
      
      expect(exports).toHaveLength(5);
      expect(exports.map(e => e.name)).toEqual(['Button', 'Modal', 'Input', 'api', 'utils']);
    });

    it('should extract re-exports', async () => {
      const content = `
        export * from './components';
        export * from './utils';
      `;
      
      const exports = await extractExportsFromContent(content);
      
      expect(exports).toHaveLength(2);
      expect(exports[0]).toMatchObject({
        source: './components',
        type: 're-export'
      });
      expect(exports[1]).toMatchObject({
        source: './utils',
        type: 're-export'
      });
    });
  });

  describe('resolveModulePath', () => {
    beforeEach(() => {
      vi.mocked(fs.access).mockReset();
    });

    it('should resolve relative imports with extensions', async () => {
      vi.mocked(fs.access).mockResolvedValueOnce(undefined);
      const result = await resolveModulePath('./utils', '/project/src/index.ts', '/project');
      // When a file exists with extension, we should return it
      expect(result).toBe('/project/src/utils.ts');
    });

    it('should try multiple extensions for relative imports', async () => {
      const mockAccess = vi.mocked(fs.access);
      mockAccess
        .mockRejectedValueOnce(new Error('ENOENT')) // .ts fails
        .mockResolvedValueOnce(undefined); // .tsx succeeds  
      
      const result = await resolveModulePath('./component', '/project/src/index.ts', '/project');
      
      expect(result).toBe('/project/src/component.tsx');
    });

    it('should resolve to index files', async () => {
      const mockAccess = vi.mocked(fs.access);
      mockAccess
        .mockRejectedValueOnce(new Error('ENOENT')) // direct file fails
        .mockRejectedValueOnce(new Error('ENOENT')) // .ts fails
        .mockRejectedValueOnce(new Error('ENOENT')) // .tsx fails
        .mockRejectedValueOnce(new Error('ENOENT')) // .js fails
        .mockRejectedValueOnce(new Error('ENOENT')) // .jsx fails
        .mockRejectedValueOnce(new Error('ENOENT')) // .json fails
        .mockResolvedValueOnce(undefined); // index.ts succeeds
      const result = await resolveModulePath('./utils', '/project/src/index.ts', '/project');
      // Our order prefers .ts for index
      expect(result).toBe('/project/src/utils/index.ts');
    });

    it('should handle node_modules with package.json', async () => {
      const mockAccess = vi.mocked(fs.access);
      const mockReadFile = vi.mocked(fs.readFile);
      // node_modules exists
      mockAccess.mockResolvedValueOnce(undefined);
      // package.json exists
      mockAccess.mockResolvedValueOnce(undefined);
      // read package.json
      mockReadFile.mockResolvedValueOnce(JSON.stringify({ main: 'index.js' }));
      // main file exists
      mockAccess.mockResolvedValueOnce(undefined);
      const result = await resolveModulePath('react', '/project/src/index.ts', '/project');
      expect(result).toBe('/project/node_modules/react/index.js');
    });

    it('should return null when module not found', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));
      
      const result = await resolveModulePath('./nonexistent', '/project/src/index.ts', '/project');
      
      expect(result).toBeNull();
    });
  });

  describe('findSymbolInFile', () => {
    it('should find function definitions', async () => {
      const content = `
        function getUserData(id: string) {
          return fetch(\`/api/users/\${id}\`);
        }
      `;
      
      vi.mocked(fs.readFile).mockResolvedValue(content);
      
      const result = await findSymbolInFile('getUserData', '/src/api.ts', {});
      
      expect(result).toMatchObject({
        symbol: 'getUserData',
        file_path: '/src/api.ts',
        line_number: 2,
        location_type: 'project'
      });
    });

    it('should find class definitions', async () => {
      const content = `
        export class UserService {
          constructor() {}
        }
      `;
      
      vi.mocked(fs.readFile).mockResolvedValue(content);
      
      const result = await findSymbolInFile('UserService', '/src/services.ts', {});
      
      expect(result).toMatchObject({
        symbol: 'UserService',
        location_type: 'project'
      });
    });

    it('should identify node_modules location', async () => {
      const content = 'function React() {}';
      
      vi.mocked(fs.readFile).mockResolvedValue(content);
      
      const result = await findSymbolInFile('React', '/project/node_modules/react/index.js', {});
      
      expect(result?.location_type).toBe('node_modules');
    });

    it('should return null when symbol not found', async () => {
      const content = 'const other = "something";';
      
      vi.mocked(fs.readFile).mockResolvedValue(content);
      
      const result = await findSymbolInFile('nonexistent', '/src/file.ts', {});
      
      expect(result).toBeNull();
    });

    it('should handle file read errors', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('Permission denied'));
      
      const result = await findSymbolInFile('symbol', '/restricted/file.ts', {});
      
      expect(result).toBeNull();
    });
  });

  describe('searchSymbolInProject', () => {
    it('should search across project files', async () => {
      const { execSync } = await import('child_process');
      vi.mocked(execSync).mockReturnValue('/project/src/utils.ts\n/project/src/api.ts\n');
      
      const mockReadFile = vi.mocked(fs.readFile);
      mockReadFile
        .mockResolvedValueOnce('function searchSymbol() { return true; }') // utils.ts has the symbol
        .mockResolvedValueOnce('const other = true;'); // api.ts doesn't
      
      const results = await searchSymbolInProject('searchSymbol', '/project', '/project/src/index.ts');
      
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        symbol: 'searchSymbol',
        location_type: 'project'
      });
    });

    it('should exclude the specified file', async () => {
      const { execSync } = await import('child_process');
      vi.mocked(execSync).mockReturnValue('/project/src/index.ts\n/project/src/utils.ts\n');
      
      const mockReadFile = vi.mocked(fs.readFile);
      mockReadFile
        .mockResolvedValueOnce('ignored') // index.ts (should be skipped)
        .mockResolvedValueOnce('const test = true;'); // utils.ts content
      
      await searchSymbolInProject('symbol', '/project', '/project/src/index.ts');
      
      // Should call findSymbolInFile only for utils.ts (we normalize and filter index.ts)
      const calls = (fs.readFile as any).mock.calls.map((c: any[]) => c[0]);
      expect(calls).toEqual(['/project/src/utils.ts']);
    });

    it('should handle command execution errors gracefully', async () => {
      const { execSync } = await import('child_process');
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('Command failed');
      });
      
      const results = await searchSymbolInProject('symbol', '/project', '/excluded.ts');
      
      expect(results).toEqual([]);
    });
  });

  describe('getPackageInfo', () => {
    it('should extract package info from node_modules path', async () => {
      const packageJson = {
        name: 'react',
        version: '18.2.0',
        description: 'React library',
        main: 'index.js',
        types: 'index.d.ts'
      };
      
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(packageJson));
      
      const result = await getPackageInfo('/project/node_modules/react/index.js');
      
      expect(result).toMatchObject({
        name: 'react',
        version: '18.2.0',
        description: 'React library'
      });
    });

    it('should return null for non-node_modules paths', async () => {
      const result = await getPackageInfo('/project/src/utils.ts');
      
      expect(result).toBeNull();
    });

    it('should handle missing package.json', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));
      
      const result = await getPackageInfo('/project/node_modules/react/index.js');
      
      expect(result).toBeNull();
    });
  });

  describe('getPackageDependencies', () => {
    it('should extract dependencies from package.json', async () => {
      const packageJson = {
        dependencies: { 'react': '^18.0.0' },
        devDependencies: { 'typescript': '^4.0.0' },
        peerDependencies: { 'react-dom': '^18.0.0' }
      };
      
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(packageJson));
      
      const result = await getPackageDependencies('/project/node_modules/react/index.js');
      
      expect(result).toEqual(['react', 'typescript', 'react-dom']);
    });

    it('should return null when package info not available', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));
      
      const result = await getPackageDependencies('/project/src/file.ts');
      
      expect(result).toBeNull();
    });
  });

  describe('analyzeSpecificSymbol', () => {
    it('should analyze function symbols', async () => {
      const content = `
/**
 * Gets user data from API
 */
function getUserData(id: string): Promise<User> {
  return fetch(\`/api/users/\${id}\`).then(r => r.json());
}`;
      
      const result = await analyzeSpecificSymbol('getUserData', content, '/api.ts');
      
      expect(result).toMatchObject({
        symbol: 'getUserData',
        type: 'function',
        start_line: 4,
        documentation: expect.stringContaining('Gets user data from API')
      });
    });

    it('should analyze class symbols', async () => {
      const content = `
export class UserService {
  private api: ApiClient;
  
  constructor(api: ApiClient) {
    this.api = api;
  }
}`;
      
      const result = await analyzeSpecificSymbol('UserService', content, '/services.ts');
      
      expect(result).toMatchObject({
        symbol: 'UserService',
        type: 'class'
      });
    });

    it('should return null for non-existent symbols', async () => {
      const content = 'const something = "else";';
      
      const result = await analyzeSpecificSymbol('nonexistent', content, '/file.ts');
      
      expect(result).toBeNull();
    });
  });

  describe('extractJSDocComment', () => {
    it('should extract JSDoc comments', () => {
      const content = `
/**
 * This is a JSDoc comment
 * @param id - User ID
 * @returns User data
 */
function getUserData(id: string) {}`;
      
      const symbolIndex = content.indexOf('function getUserData');
      const jsDoc = extractJSDocComment(content, symbolIndex);
      
      expect(jsDoc).toContain('This is a JSDoc comment');
      expect(jsDoc).toContain('@param id - User ID');
    });

    it('should return null when no JSDoc found', () => {
      const content = `
// Regular comment
function getUserData(id: string) {}`;
      
      const symbolIndex = content.indexOf('function getUserData');
      const jsDoc = extractJSDocComment(content, symbolIndex);
      
      expect(jsDoc).toBeNull();
    });
  });

  describe('traceDependencyChain', () => {
    beforeEach(() => {
      vi.mocked(fs.readFile).mockReset();
    });

    it('should trace a simple dependency chain', async () => {
      // Mock file contents
      const startFileContent = 'import { helper } from "./utils";';
      const utilsFileContent = 'export function helper() { return true; }';
      
      vi.mocked(fs.readFile)
        .mockResolvedValueOnce(startFileContent)  // start file
        .mockResolvedValueOnce(utilsFileContent); // utils file
      
      // Mock path resolution for relative import
      vi.mocked(fs.access).mockResolvedValue(undefined);
      
      const visited = new Set<string>();
      const chain = await traceDependencyChain('helper', '/project/src/index.ts', '/project', visited, 5);
      
      expect(chain).toHaveLength(1);
      expect(chain[0].type).toBe('import');
    });

    it('should handle local definitions', async () => {
      const content = 'function localHelper() { return true; }';
      
      vi.mocked(fs.readFile).mockResolvedValue(content);
      
      const visited = new Set<string>();
      const chain = await traceDependencyChain('localHelper', '/project/src/file.ts', '/project', visited, 5);
      
      expect(chain).toHaveLength(1);
      expect(chain[0].type).toBe('definition');
      expect(chain[0].is_final).toBe(true);
    });

    it('should prevent infinite loops with visited tracking', async () => {
      const visited = new Set(['/project/src/file.ts']);
      
      const chain = await traceDependencyChain('symbol', '/project/src/file.ts', '/project', visited, 5);
      
      expect(chain).toHaveLength(0);
    });

    it('should respect max depth', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('import { symbol } from "./other";');
      
      const visited = new Set<string>();
      const chain = await traceDependencyChain('symbol', '/project/src/file.ts', '/project', visited, 0);
      
      expect(chain).toHaveLength(0);
    });

    it('should handle file read errors', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('Permission denied'));
      
      const visited = new Set<string>();
      const chain = await traceDependencyChain('symbol', '/project/src/file.ts', '/project', visited, 5);
      
      expect(chain).toHaveLength(1);
      expect(chain[0].type).toBe('error');
    });
  });
});
