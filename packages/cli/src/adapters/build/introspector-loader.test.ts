import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { loadRouter } from './introspector';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('loadRouter with external dependencies', () => {
  let tempDir: string;
  let routerPath: string;

  beforeAll(async () => {
    // Create a temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'igniter-test-'));
    
    // Create a simple router file that imports from @igniter-js/core
    const routerContent = `
      import { Igniter } from '@igniter-js/core'

      const igniter = Igniter
        .context(async () => ({}))
        .config({
          baseURL: 'http://localhost:3000',
          basePATH: '/api/v1',
        })
        .create()

      const testController = igniter.controller({
        path: '/test',
        actions: {
          hello: igniter.query({
            method: 'GET',
            path: '/hello',
            handler: async () => {
              return { message: 'Hello World' }
            }
          })
        }
      })

      export const AppRouter = igniter.router({
        controllers: {
          test: testController
        }
      })
    `;
    
    routerPath = path.join(tempDir, 'igniter.router.ts');
    fs.writeFileSync(routerPath, routerContent, 'utf-8');
  });

  afterAll(() => {
    // Clean up
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should successfully load a router with external dependencies', async () => {
    const router = await loadRouter(routerPath);
    
    expect(router).toBeDefined();
    expect(router.controllers).toBeDefined();
    expect(router.caller).toBeDefined();
    expect(router.handler).toBeDefined();
    
    // Check that the controller was loaded correctly
    expect(router.controllers.test).toBeDefined();
    expect(router.controllers.test.actions).toBeDefined();
    expect(router.controllers.test.actions.hello).toBeDefined();
  });

  it('should have a properly initialized caller property', async () => {
    const router = await loadRouter(routerPath);
    
    // The caller should be a Proxy object
    expect(typeof router.caller).toBe('object');
    expect(router.caller).not.toBeNull();
    
    // It should have the controller accessible
    expect(router.caller.test).toBeDefined();
    expect(router.caller.test.hello).toBeDefined();
  });
});
