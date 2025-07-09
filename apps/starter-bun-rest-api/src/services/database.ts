import { PrismaClient } from '@prisma/client'

/**
 * Prisma client instance for database operations.
 * 
 * @remarks
 * Provides type-safe database access with Prisma ORM.
 * 
 * @see https://www.prisma.io/docs/concepts/components/prisma-client
 */
export const database = new PrismaClient()
