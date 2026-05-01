// Mock router used for hook type validation.
import { Igniter } from '../../dist';
import { z } from 'zod';

const igniter = Igniter.create()
  .withContext(() => {
    return {
      requestId: 'req-123',
    };
  })
  .build();

const todosController = igniter.controller({
  path: '/todos',
  name: 'todos',
  description: 'Controller for managing todos',
  actions: {
    list: igniter.query({
      path: '/',
      query: z.object({ searchTerm: z.string().optional() }),
      handler: ({ response, context }) => response.success({ items: [] as string[] }),
    }),
    create: igniter.mutation({
      path: '/',
      method: 'POST',
      body: z.object({ title: z.string() }),
      handler: ({ response }) => response.created({ id: '1' }),
    }),
  },
});

export const router = igniter.router
  .create()
  .addController('todos', todosController)
  .build();
