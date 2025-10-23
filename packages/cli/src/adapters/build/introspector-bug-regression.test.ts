import { describe, it, expect } from 'vitest';
import { loadRouter, introspectRouter } from './introspector';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('loadRouter - error scenario from bug report', () => {
  it('should not throw "Cannot read properties of undefined (reading caller)" error', async () => {
    // This test reproduces the bug scenario where the router is loaded but
    // the caller property is missing or undefined, causing a TypeError
    // when createIgniterClient tries to access router.caller
    
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'igniter-bug-test-'));
    
    try {
      // Create a router file similar to what users would have
      const routerContent = `
        import { Igniter } from '@igniter-js/core'

        const igniter = Igniter
          .context(async () => ({ userId: 'test-user' }))
          .config({
            baseURL: 'http://localhost:3000',
            basePATH: '/api/v1',
          })
          .create()

        const exampleController = igniter.controller({
          path: '/example',
          actions: {
            hello: igniter.query({
              method: 'GET',
              path: '/hello',
              handler: async ({ ctx }) => {
                return { message: 'Hello', userId: ctx.userId }
              }
            })
          }
        })

        export const AppRouter = igniter.router({
          controllers: {
            example: exampleController
          }
        })
      `;
      
      const routerPath = path.join(tempDir, 'igniter.router.ts');
      fs.writeFileSync(routerPath, routerContent, 'utf-8');
      
      // This should not throw any errors
      const router = await loadRouter(routerPath);
      
      // Verify the router has all required properties
      expect(router).toBeDefined();
      expect(router.caller).toBeDefined();
      expect(typeof router.caller).toBe('object');
      
      // Verify we can introspect the router without errors
      const introspected = introspectRouter(router);
      expect(introspected.schema.controllers).toBeDefined();
      expect(introspected.schema.controllers.example).toBeDefined();
      
      // The critical check: caller should be accessible and have the controller
      expect(router.caller.example).toBeDefined();
      expect(router.caller.example.hello).toBeDefined();
      
      // This is what createIgniterClient does - it should not throw
      expect(() => {
        const caller = router.caller;
        expect(caller).toBeTruthy();
      }).not.toThrow();
      
    } finally {
      // Clean up
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }
  });
});
