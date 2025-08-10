import { describe, it, expect } from 'vitest';
import { OpenAPIGenerator } from './openapi-generator';
import { z } from 'zod';

describe('OpenAPIGenerator', () => {
  it('should generate a basic OpenAPI spec', () => {
    const mockRouter = {
      controllers: {
        users: {
          name: 'users',
          path: '/users',
          description: 'User management endpoints',
          actions: {
            listUsers: {
              name: 'listUsers',
              path: '/',
              method: 'GET',
              description: 'Retrieve a list of users',
              query: z.object({
                page: z.number().default(1).describe('Page number'),
                limit: z.number().max(100).optional().describe('Items per page'),
              }),
              stream: false,
            },
            createUser: {
              name: 'createUser',
              path: '/',
              method: 'POST',
              description: 'Create a new user',
              body: z.object({
                name: z.string().min(3).describe("User's full name"),
                email: z.string().email().describe("User's email address"),
              }),
              stream: false,
            },
          },
        },
      },
      config: {
        docs: {
          info: {
            title: 'Test API',
            version: '1.0.0',
            description: 'A test API for Igniter.js',
          },
          servers: [
            { url: 'http://localhost:3000', description: 'Local Development Server' },
          ],
        },
      },
    };

    const generator = new OpenAPIGenerator(mockRouter, mockRouter.config.docs);
    const spec = generator.generate();

    expect(spec.openapi).toBe('3.0.0');
    expect(spec.info.title).toBe('Test API');
    expect(spec.servers).toHaveLength(1);
    expect(spec.paths['/users/'].get.summary).toBe('Retrieve a list of users');
    expect(spec.paths['/users/'].post.operationId).toBe('createUser');
    expect(spec.components.schemas.UsersListUsersQuery).toBeDefined();
    expect(spec.components.schemas.UsersCreateUserBody).toBeDefined();
    // Check if the schema was correctly generated
    expect(spec.components.schemas.UsersCreateUserBody.properties.name.description).toBe("User's full name");
  });
});
