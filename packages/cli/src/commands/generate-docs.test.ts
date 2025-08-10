import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execa } from 'execa';
import * as fs from 'fs';
import * as path from 'path';

// Mock the router file for testing purposes
const MOCK_ROUTER_CONTENT = `
import { Igniter } from '@igniter-js/core';
import { z } from 'zod';

export const AppRouter = Igniter.router({
  context: () => ({}),
  controllers: {
    users: Igniter.controller({
      name: 'users',
      path: '/users',
      description: 'User management endpoints',
      actions: {
        list: Igniter.query({
          name: 'listUsers',
          path: '/',
          method: 'GET',
          description: 'Retrieve a list of users',
          query: z.object({
            page: z.number().default(1).describe('Page number'),
            limit: z.number().max(100).optional().describe('Items per page'),
          }),
          handler: async ({ response }) => response.success([]),
        }),
        create: Igniter.mutation({
          name: 'createUser',
          path: '/',
          method: 'POST',
          description: 'Create a new user',
          body: z.object({
            name: z.string().min(3).describe('User's full name'),
            email: z.string().email().describe('User's email address'),
          }),
          handler: async ({ response }) => response.created({ id: '1' }),
        }),
      },
    }),
  },
  config: {
    baseURL: 'http://localhost:3000',
    basePATH: '/api/v1',
    docs: {
      info: {
        title: 'Test API',
        version: '1.0.0',
        description: 'A test API for Igniter.js',
      },
      servers: [
        { url: 'http://localhost:3000', description: 'Local Development Server' },
      ],
      playground: {
        enabled: true,
        route: '/docs',
      },
    },
  },
});
`;

const CLI_PATH = path.resolve(__dirname, '../../src/index.ts');
const TEMP_DIR = path.resolve(__dirname, './temp_cli_test');
const OUTPUT_DIR = path.join(TEMP_DIR, 'output');
const OPENAPI_JSON_PATH = path.join(OUTPUT_DIR, 'openapi.json');
const SCALAR_HTML_PATH = path.join(OUTPUT_DIR, 'index.html');

describe('igniter generate docs', () => {
  beforeEach(() => {
    // Create a temporary directory for the test
    if (fs.existsSync(TEMP_DIR)) {
      fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEMP_DIR, { recursive: true });
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    // Create a mock router file in the temporary directory
    fs.writeFileSync(path.join(TEMP_DIR, 'src', 'igniter.router.ts'), MOCK_ROUTER_CONTENT);
  });

  afterEach(() => {
    // Clean up the temporary directory
    if (fs.existsSync(TEMP_DIR)) {
      fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }
  });

  it('should generate openapi.json successfully', async () => {
    const { stdout } = await execa('npx', ['tsx', CLI_PATH, 'generate', 'docs', '--output', OUTPUT_DIR], {
      cwd: TEMP_DIR,
    });

    expect(stdout).toContain('OpenAPI specification generated at');
    expect(fs.existsSync(OPENAPI_JSON_PATH)).toBe(true);

    const specContent = JSON.parse(fs.readFileSync(OPENAPI_JSON_PATH, 'utf8'));
    expect(specContent.info.title).toBe('Test API');
    expect(specContent.paths['/users/'].get.summary).toBe('Retrieve a list of users');
  });

  it('should generate openapi.json and Scalar UI (index.html) successfully', async () => {
    const { stdout } = await execa('npx', ['tsx', CLI_PATH, 'generate', 'docs', '--output', OUTPUT_DIR, '--ui'], {
      cwd: TEMP_DIR,
    });

    expect(stdout).toContain('OpenAPI specification generated at');
    expect(stdout).toContain('Scalar UI generated at');
    expect(fs.existsSync(OPENAPI_JSON_PATH)).toBe(true);
    expect(fs.existsSync(SCALAR_HTML_PATH)).toBe(true);

    const htmlContent = fs.readFileSync(SCALAR_HTML_PATH, 'utf8');
    expect(htmlContent).toContain('<script id="api-reference" data-url="./openapi.json"></script>');
    expect(htmlContent).toContain('<script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>');
  });

  it('should handle missing router file gracefully', async () => {
    fs.rmSync(path.join(TEMP_DIR, 'src', 'igniter.router.ts')); // Remove the mock router

    const { stderr } = await execa('npx', ['tsx', CLI_PATH, 'generate', 'docs', '--output', OUTPUT_DIR], {
      cwd: TEMP_DIR,
      reject: false, // Do not throw on non-zero exit code
    });

    expect(stderr).toContain('No Igniter router found in your project');
    expect(fs.existsSync(OPENAPI_JSON_PATH)).toBe(false);
  });
});
