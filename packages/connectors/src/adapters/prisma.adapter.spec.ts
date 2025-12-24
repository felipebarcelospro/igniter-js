/**
 * @fileoverview Tests for IgniterConnectorPrismaAdapter
 * @module @igniter-js/connectors/adapters/prisma.adapter.spec
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Since IgniterConnectorPrismaAdapter requires a real Prisma client, we'll test the interface
// and behavior patterns. Full integration tests would require a database.

describe('IgniterConnectorPrismaAdapter', () => {
  describe('static create()', () => {
    it('should throw error when model does not exist', async () => {
      // Dynamic import to handle the test
      const { IgniterConnectorPrismaAdapter } = await import('./prisma.adapter')
      
      const mockPrisma = {
        $connect: vi.fn(),
        $disconnect: vi.fn(),
        // No 'Connector' model
      }

      expect(() => {
        IgniterConnectorPrismaAdapter.create(mockPrisma)
      }).toThrow('Prisma model "Connector" not found')
    })

    it('should create adapter with default model name', async () => {
      const { IgniterConnectorPrismaAdapter } = await import('./prisma.adapter')
      
      const mockModel = {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        upsert: vi.fn(),
        count: vi.fn(),
      }

      const mockPrisma = {
        $connect: vi.fn(),
        $disconnect: vi.fn(),
        Connector: mockModel,
      }

      const adapter = IgniterConnectorPrismaAdapter.create(mockPrisma)
      expect(adapter).toBeDefined()
    })

    it('should create adapter with custom model name', async () => {
      const { IgniterConnectorPrismaAdapter } = await import('./prisma.adapter')
      
      const mockModel = {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        upsert: vi.fn(),
        count: vi.fn(),
      }

      const mockPrisma = {
        $connect: vi.fn(),
        $disconnect: vi.fn(),
        Integration: mockModel,
      }

      const adapter = IgniterConnectorPrismaAdapter.create(mockPrisma, {
        model: 'Integration',
      })
      expect(adapter).toBeDefined()
    })
  })

  describe('CRUD operations', () => {
    let adapter: any
    let mockModel: any

    beforeEach(async () => {
      const { IgniterConnectorPrismaAdapter } = await import('./prisma.adapter')
      
      mockModel = {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        upsert: vi.fn(),
        count: vi.fn(),
      }

      const mockPrisma = {
        $connect: vi.fn(),
        $disconnect: vi.fn(),
        Connector: mockModel,
      }

      adapter = IgniterConnectorPrismaAdapter.create(mockPrisma)
    })

    describe('get()', () => {
      it('should call findUnique with correct parameters', async () => {
        const mockRecord = {
          id: 'cuid123',
          scope: 'organization',
          identity: 'org_123',
          provider: 'telegram',
          value: { apiKey: 'test' },
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        mockModel.findUnique.mockResolvedValue(mockRecord)

        const result = await adapter.get('organization', 'org_123', 'telegram')

        expect(mockModel.findUnique).toHaveBeenCalledWith({
          where: {
            scope_identity_provider: {
              scope: 'organization',
              identity: 'org_123',
              provider: 'telegram',
            },
          },
        })
        expect(result).toEqual(mockRecord)
      })

      it('should return null when record not found', async () => {
        mockModel.findUnique.mockResolvedValue(null)

        const result = await adapter.get('organization', 'org_123', 'unknown')

        expect(result).toBeNull()
      })
    })

    describe('list()', () => {
      it('should call findMany with correct parameters', async () => {
        const mockRecords = [
          {
            id: 'cuid1',
            scope: 'organization',
            identity: 'org_123',
            provider: 'telegram',
            value: {},
            enabled: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'cuid2',
            scope: 'organization',
            identity: 'org_123',
            provider: 'slack',
            value: {},
            enabled: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]

        mockModel.findMany.mockResolvedValue(mockRecords)

        const result = await adapter.list('organization', 'org_123')

        expect(mockModel.findMany).toHaveBeenCalledWith({
          where: {
            scope: 'organization',
            identity: 'org_123',
          },
        })
        expect(result).toHaveLength(2)
      })

      it('should return empty array when no records found', async () => {
        mockModel.findMany.mockResolvedValue([])

        const result = await adapter.list('organization', 'org_empty')

        expect(result).toEqual([])
      })
    })

    describe('save()', () => {
      it('should call upsert with correct parameters', async () => {
        const now = new Date()
        const mockRecord = {
          id: 'cuid123',
          scope: 'organization',
          identity: 'org_123',
          provider: 'telegram',
          value: { apiKey: 'secret' },
          enabled: true,
          createdAt: now,
          updatedAt: now,
        }

        mockModel.upsert.mockResolvedValue(mockRecord)

        const result = await adapter.save(
          'organization',
          'org_123',
          'telegram',
          { apiKey: 'secret' },
          true
        )

        expect(mockModel.upsert).toHaveBeenCalledWith({
          where: {
            scope_identity_provider: {
              scope: 'organization',
              identity: 'org_123',
              provider: 'telegram',
            },
          },
          create: {
            scope: 'organization',
            identity: 'org_123',
            provider: 'telegram',
            value: { apiKey: 'secret' },
            enabled: true,
          },
          update: {
            value: { apiKey: 'secret' },
            enabled: true,
          },
        })
        expect(result).toEqual(mockRecord)
      })

      it('should default enabled to true when not provided', async () => {
        mockModel.upsert.mockResolvedValue({})

        await adapter.save(
          'organization',
          'org_123',
          'telegram',
          { apiKey: 'secret' }
        )

        expect(mockModel.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            create: expect.objectContaining({
              enabled: true,
            }),
          })
        )
      })
    })

    describe('update()', () => {
      it('should call update with correct parameters', async () => {
        const mockRecord = {
          id: 'cuid123',
          scope: 'organization',
          identity: 'org_123',
          provider: 'telegram',
          value: { apiKey: 'new-secret' },
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        mockModel.update.mockResolvedValue(mockRecord)

        const result = await adapter.update(
          'organization',
          'org_123',
          'telegram',
          { value: { apiKey: 'new-secret' } }
        )

        expect(mockModel.update).toHaveBeenCalledWith({
          where: {
            scope_identity_provider: {
              scope: 'organization',
              identity: 'org_123',
              provider: 'telegram',
            },
          },
          data: { value: { apiKey: 'new-secret' } },
        })
        expect(result).toEqual(mockRecord)
      })

      it('should update enabled status', async () => {
        mockModel.update.mockResolvedValue({})

        await adapter.update(
          'organization',
          'org_123',
          'telegram',
          { enabled: false }
        )

        expect(mockModel.update).toHaveBeenCalledWith({
          where: expect.any(Object),
          data: { enabled: false },
        })
      })
    })

    describe('delete()', () => {
      it('should call delete with correct parameters', async () => {
        mockModel.delete.mockResolvedValue({})

        await adapter.delete('organization', 'org_123', 'telegram')

        expect(mockModel.delete).toHaveBeenCalledWith({
          where: {
            scope_identity_provider: {
              scope: 'organization',
              identity: 'org_123',
              provider: 'telegram',
            },
          },
        })
      })
    })
  })
})
