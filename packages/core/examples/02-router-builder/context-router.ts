// Validates: context type flows through router actions and does not collapse to never.
import { Igniter } from '@igniter-js/core';

type CustomContext = { userId: string };

const igniter = Igniter.create()
  .withContext<CustomContext>()
  .build();

const controller = igniter.controller({
  path: '/test',
  name: 'test',
  description: 'Test controller with custom context',
  actions: {
    hello: igniter.query({
      path: '/hello',
      handler: ({ context, response }) => {
        return response.success({ message: `Hello ${context.userId}` });
      },
    }),
  },
});

const router = igniter.router
  .create()
  .addController('test', controller)
  .build();

type RouterType = typeof router;
const typedRouter: RouterType = router;

void typedRouter;
