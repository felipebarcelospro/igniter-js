import { igniter } from '@/igniter';
import { z } from 'zod';
import { messageProcedure } from '../procedures/message.procedure'
import { CreateMessageInputSchema, UpdateMessageInputSchema } from '../message.interfaces'

export const messageController = igniter.controller({
  name: 'Message',
  description: 'Endpoints for Messages',
  path: '/messages', // e.g., /users
  actions: {
    list: igniter.query({
      name: 'list',
      description: 'List all Messages',
      path: '/',
      stream: true,
      use: [messageProcedure()],
      handler: async ({ context, response }) => {
        const records = await context.messageRepository.findAll()
        return response.success(records)
      },
    }),

    getById: igniter.query({
      name: 'getById',
      description: 'Get a Message by ID',
      path: '/:id' as const,
      use: [messageProcedure()],
      handler: async ({ request, context, response }) => {
        const record = await context.messageRepository.findById(request.params.id)
        if (!record) {
          return response.notFound('Message not found')
        }
        return response.success(record)
      },
    }),

    create: igniter.mutation({
      name: 'create',
      description: 'Create a new Message',
      path: '/',
      method: 'POST',
      body: CreateMessageInputSchema,
      use: [messageProcedure()],
      handler: async ({ request, context, response }) => {
        const newRecord = await context.messageRepository.create(request.body)
        return response.created(newRecord).revalidate(['message.list'])
      },
    }),

    update: igniter.mutation({
      name: 'update',
      description: 'Update a Message by ID',
      path: '/:id' as const,
      method: 'PUT',
      body: UpdateMessageInputSchema,
      use: [messageProcedure()],
      handler: async ({ request, context, response }) => {
        const updatedRecord = await context.messageRepository.update(request.params.id, request.body)
        return response.success(updatedRecord).revalidate(['message.list', 'message.getById'])
      },
    }),

    delete: igniter.mutation({
      name: 'delete',
      description: 'Delete a Message by ID',
      path: '/:id' as const,
      method: 'DELETE',
      use: [messageProcedure()],
      handler: async ({ request, context, response }) => {
        await context.messageRepository.delete(request.params.id)
        return response.noContent().revalidate(['message.list', 'message.getById'])
      },
    }),
  },
})
