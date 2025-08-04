import { igniter } from '@/igniter';
import type { CreateMessageInput, UpdateMessageInput } from '../message.interfaces';

export const messageProcedure = igniter.procedure({
  name: 'message',
  handler: async (_, { context }) => {
    // This procedure acts as a repository, centralizing database access logic.
    return {
      messageRepository: {
        findAll: () => context.database.message.findMany(),
        findById: (id: string) => context.database.message.findUnique({ where: { id } }),
        create: (data: CreateMessageInput) => context.database.message.create({ data }),
        update: (id: string, data: UpdateMessageInput) => context.database.message.update({ where: { id }, data }),
        delete: (id: string) => context.database.message.delete({ where: { id } }),
      }
    };
  }
});
