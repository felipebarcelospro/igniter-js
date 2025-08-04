import { z } from 'zod';

// Generated from your 'Message' Prisma model
export const MessageSchema = z.object({
  id: z.string().nullable(),
  content: z.string(),
  sender: z.string(),
  createdAt: z.date().nullable(),
  updatedAt: z.date(),
});

// Schema for creating a new Message.
// Fields managed by the database (id, createdAt, etc.) are omitted.
export const CreateMessageInputSchema = MessageSchema.omit({
  id: true,
  updatedAt: true,
  createdAt: true,
});

// Schema for updating a Message. All fields are optional.
export const UpdateMessageInputSchema = CreateMessageInputSchema.partial();

// Exporting types for convenience
export type Message = z.infer<typeof MessageSchema>;
export type CreateMessageInput = z.infer<typeof CreateMessageInputSchema>;
export type UpdateMessageInput = z.infer<typeof UpdateMessageInputSchema>;
