import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import * as path from 'path';
import {
  getLanguageFromExtension,
  determineFileType,
  extractAPIEndpoints,
  generateFeatureRecommendations,
  pathExists,
  findProjectRoot
} from './file-analysis';

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    access: vi.fn(),
    stat: vi.fn()
  }
}));

describe('File Analysis Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getLanguageFromExtension', () => {
    it('should detect TypeScript extensions correctly', () => {
      expect(getLanguageFromExtension('.ts')).toBe('typescript');
      expect(getLanguageFromExtension('.tsx')).toBe('typescript-react');
    });

    it('should detect JavaScript extensions correctly', () => {
      expect(getLanguageFromExtension('.js')).toBe('javascript');
      expect(getLanguageFromExtension('.jsx')).toBe('javascript-react');
    });

    it('should detect common web languages', () => {
      expect(getLanguageFromExtension('.html')).toBe('html');
      expect(getLanguageFromExtension('.css')).toBe('css');
      expect(getLanguageFromExtension('.scss')).toBe('scss');
      expect(getLanguageFromExtension('.json')).toBe('json');
    });

    it('should detect markdown formats', () => {
      expect(getLanguageFromExtension('.md')).toBe('markdown');
      expect(getLanguageFromExtension('.mdx')).toBe('mdx');
    });

    it('should detect other programming languages', () => {
      expect(getLanguageFromExtension('.py')).toBe('python');
      expect(getLanguageFromExtension('.go')).toBe('go');
      expect(getLanguageFromExtension('.rs')).toBe('rust');
      expect(getLanguageFromExtension('.java')).toBe('java');
    });

    it('should handle case insensitive extensions', () => {
      expect(getLanguageFromExtension('.TS')).toBe('typescript');
      expect(getLanguageFromExtension('.JS')).toBe('javascript');
    });

    it('should return unknown for unrecognized extensions', () => {
      expect(getLanguageFromExtension('.xyz')).toBe('unknown');
      expect(getLanguageFromExtension('.random')).toBe('unknown');
    });
  });

  describe('determineFileType', () => {
    it('should detect router files', () => {
      expect(determineFileType('/app/router.ts', '')).toBe('router');
      expect(determineFileType('/api/user-route.ts', '')).toBe('router');
      expect(determineFileType('/src/api/auth.ts', '')).toBe('router');
    });

    it('should detect controller files', () => {
      expect(determineFileType('/controllers/user.controller.ts', '')).toBe('controller');
      expect(determineFileType('/handlers/auth.handler.ts', '')).toBe('controller');
    });

    it('should detect service files', () => {
      expect(determineFileType('/services/user.service.ts', '')).toBe('service');
      expect(determineFileType('/lib/auth-service.ts', '')).toBe('service');
    });

    it('should detect model files', () => {
      expect(determineFileType('/models/user.model.ts', '')).toBe('model');
      expect(determineFileType('/schemas/auth.schema.ts', '')).toBe('model');
      expect(determineFileType('/types/user.types.ts', '')).toBe('model');
    });

    it('should detect React component files', () => {
      expect(determineFileType('/components/Button.tsx', '')).toBe('component');
      expect(determineFileType('/ui/Modal.component.tsx', '')).toBe('component');
    });

    it('should detect test files', () => {
      expect(determineFileType('/user.test.ts', '')).toBe('test');
      expect(determineFileType('/auth.spec.ts', '')).toBe('test');
    });

    it('should detect config files', () => {
      expect(determineFileType('/config/database.ts', '')).toBe('config');
      expect(determineFileType('/settings.config.ts', '')).toBe('config');
    });

    it('should detect utility files', () => {
      expect(determineFileType('/utils/string.util.ts', '')).toBe('utility');
      expect(determineFileType('/helpers/format.helper.ts', '')).toBe('utility');
    });

    it('should return other for unrecognized files', () => {
      expect(determineFileType('/random/file.ts', '')).toBe('other');
    });
  });

  describe('extractAPIEndpoints', () => {
    it('should extract Igniter.js router patterns', () => {
      const content = `
        router.query('getUser', input => { ... });
        router.mutation('createUser', input => { ... });
        router.stream('userEvents', input => { ... });
      `;
      
      const endpoints = extractAPIEndpoints(content, '/api/users.ts');
      
      expect(endpoints).toHaveLength(3);
      expect(endpoints[0]).toMatchObject({
        type: 'igniter',
        method: 'QUERY',
        path: 'getUser'
      });
      expect(endpoints[1]).toMatchObject({
        type: 'igniter', 
        method: 'MUTATION',
        path: 'createUser'
      });
      expect(endpoints[2]).toMatchObject({
        type: 'igniter',
        method: 'STREAM',
        path: 'userEvents'
      });
    });

    it('should extract router.route patterns', () => {
      const content = `
        app.route('/api/users');
        router.route('/auth/login');
      `;
      
      const endpoints = extractAPIEndpoints(content, '/routes.ts');
      
      expect(endpoints).toHaveLength(2);
      expect(endpoints[0].path).toBe('/api/users');
      expect(endpoints[1].path).toBe('/auth/login');
    });

    it('should extract Express/Next.js patterns', () => {
      const content = `
        app.get('/api/users', handler);
        router.post('/api/auth', handler);
        app.put('/api/users/:id', handler);
        app.delete('/api/users/:id', handler);
      `;
      
      const endpoints = extractAPIEndpoints(content, '/api.ts');
      
      expect(endpoints).toHaveLength(4);
      expect(endpoints.map(e => e.method)).toEqual(['GET', 'POST', 'PUT', 'DELETE']);
    });

    it('should extract Next.js API route exports', () => {
      const content = `
        export async function GET(request) { ... }
        export async function POST(request) { ... }
      `;
      
      const endpoints = extractAPIEndpoints(content, '/app/api/route.ts');
      
      expect(endpoints).toHaveLength(2);
      expect(endpoints.map(e => e.method)).toEqual(['GET', 'POST']);
    });

    it('should include line numbers', () => {
      const content = `// Line 1
router.query('test', input => {
  // implementation
});`;
      
      const endpoints = extractAPIEndpoints(content, '/test.ts');
      
      expect(endpoints[0].line).toBe(2);
    });

    it('should return empty array for no endpoints', () => {
      const content = `
        const user = { name: 'John' };
        function helper() { return true; }
      `;
      
      const endpoints = extractAPIEndpoints(content, '/helpers.ts');
      expect(endpoints).toHaveLength(0);
    });
  });

  describe('generateFeatureRecommendations', () => {
    it('should recommend fixing errors', () => {
      const analysis = {
        health_summary: {
          total_errors: 3,
          total_warnings: 1,
          problematic_files: [
            { file: '/src/user.ts', error_count: 2 },
            { file: '/src/auth.ts', error_count: 1 }
          ]
        },
        api_endpoints: [],
        structure: { by_type: {} }
      };

      const recommendations = generateFeatureRecommendations(analysis);
      
      expect(recommendations).toContain('🔴 Fix 3 TypeScript errors before testing');
      expect(recommendations.some(r => r.includes('user.ts, auth.ts'))).toBe(true);
    });

    it('should recommend addressing warnings', () => {
      const analysis = {
        health_summary: {
          total_errors: 0,
          total_warnings: 5,
          problematic_files: []
        },
        api_endpoints: [],
        structure: { by_type: {} }
      };

      const recommendations = generateFeatureRecommendations(analysis);
      
      expect(recommendations).toContain('⚠️ Consider addressing 5 TypeScript warnings');
    });

    it('should recommend API testing when endpoints found', () => {
      const analysis = {
        health_summary: { total_errors: 0, total_warnings: 0 },
        api_endpoints: [
          { method: 'GET', path: '/users' },
          { method: 'POST', path: '/users' },
          { method: 'DELETE', path: '/users/:id' }
        ],
        structure: { by_type: {} }
      };

      const recommendations = generateFeatureRecommendations(analysis);
      
      expect(recommendations).toContain('🧪 Test 3 API endpoints using make_api_request tool');
      expect(recommendations).toContain('📋 Methods to test: GET, POST, DELETE');
    });

    it('should warn about large features', () => {
      const analysis = {
        health_summary: { total_errors: 0, total_warnings: 0 },
        api_endpoints: [],
        structure: { 
          total_files: 15,
          by_type: {}
        }
      };

      const recommendations = generateFeatureRecommendations(analysis);
      
      expect(recommendations.some(r => 
        r.includes('Large feature (15 files)') && r.includes('breaking into smaller modules')
      )).toBe(true);
    });

    it('should celebrate healthy features', () => {
      const analysis = {
        health_summary: { 
          total_errors: 0, 
          total_warnings: 0,
          overall_status: 'healthy'
        },
        api_endpoints: [],
        structure: { by_type: {} }
      };

      const recommendations = generateFeatureRecommendations(analysis);
      
      expect(recommendations).toContain('🎉 Feature is healthy and ready for API validation testing');
    });

    it('should detect missing endpoint detection', () => {
      const analysis = {
        health_summary: { total_errors: 0, total_warnings: 0 },
        api_endpoints: [],
        structure: { 
          by_type: { 
            router: 2,
            controller: 1
          }
        }
      };

      const recommendations = generateFeatureRecommendations(analysis);
      
      expect(recommendations).toContain('🔍 No API endpoints detected - verify router/controller implementation');
    });
  });

  describe('pathExists', () => {
    it('should return true when file exists', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      
      const result = await pathExists('/existing/file.ts');
      
      expect(result).toBe(true);
      expect(fs.access).toHaveBeenCalledWith('/existing/file.ts');
    });

    it('should return false when file does not exist', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));
      
      const result = await pathExists('/nonexistent/file.ts');
      
      expect(result).toBe(false);
    });
  });

  describe('findProjectRoot', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should find project root with package.json', async () => {
      const mockAccess = vi.mocked(fs.access);
      // Mock the specific sequence: src -> project -> found
      mockAccess
        .mockRejectedValueOnce(new Error('ENOENT')) // /deep/nested/project/src/package.json fails
        .mockRejectedValueOnce(new Error('ENOENT')) // /deep/nested/project/src/.git fails  
        .mockResolvedValueOnce(undefined); // /deep/nested/project/package.json succeeds
      
      const result = await findProjectRoot('/deep/nested/project/src/file.ts');
      
      expect(result).toBe('/deep/nested/project');
    });

    it('should find project root with .git directory', async () => {
      const mockAccess = vi.mocked(fs.access);
      mockAccess
        .mockRejectedValueOnce(new Error('ENOENT')) // /project/src/package.json not found
        .mockResolvedValueOnce(undefined); // /project/src/.git found
      
      const result = await findProjectRoot('/project/src/file.ts');
      
      expect(result).toBe('/project/src');
    });

    it('should return parent directory when no markers found', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));
      
      const result = await findProjectRoot('/some/path/file.ts');
      
      // Should return the directory containing the file
      expect(result).toBe('/some/path');
    });

    it('should handle root directory edge case', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));
      
      const result = await findProjectRoot('/file.ts');
      
      expect(result).toBe('/');
    });
  });
});
