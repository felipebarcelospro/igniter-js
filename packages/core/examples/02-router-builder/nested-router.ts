// Validates: multiple controllers keep router typings intact.
import { Igniter } from '@igniter-js/core';

const igniter = Igniter.create().build();

const usersController = igniter.controller({
  path: '/users',
  name: 'users',
  description: 'User management controller',
  actions: {
    list: igniter.query({
      path: '/',
      handler: ({ response }) => response.success({ users: [] as string[] }),
    }),
  },
});

const adminController = igniter.controller({
  path: '/admin',
  name: 'admin',
  description: 'Admin management controller',
  actions: {
    status: igniter.query({
      path: '/status',
      handler: ({ response }) => response.success({ ok: true }),
    }),
  },
});

const router = igniter.router
  .create()
  .addController('users', usersController)
  .addController('admin', adminController)
  .build();

type Controllers = typeof router.controllers;
const controllers: Controllers = router.controllers;

void controllers;
