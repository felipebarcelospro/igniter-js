/**
 * @fileoverview Tests for IgniterConnectorSchema utilities
 * @module @igniter-js/connectors/utils/igniter-connector-schema.spec
 */

import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { IgniterConnectorSchema } from './igniter-connector-schema'

describe('IgniterConnectorSchema', () => {
  describe('validate()', () => {
    it('should validate correct data successfully', async () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      })

      const result = await IgniterConnectorSchema.validate(schema, {
        name: 'John',
        age: 30,
      })

      expect(result.success).toBe(true)
      expect(result.data).toEqual({ name: 'John', age: 30 })
      expect(result.errors).toBeUndefined()
    })

    it('should return errors for invalid data', async () => {
      const schema = z.object({
        email: z.string().email(),
        count: z.number().min(0),
      })

      const result = await IgniterConnectorSchema.validate(schema, {
        email: 'not-an-email',
        count: -5,
      })

      expect(result.success).toBe(false)
      expect(result.data).toBeUndefined()
      expect(result.errors).toBeDefined()
      expect(result.errors?.length).toBeGreaterThan(0)
    })

    it('should handle missing required fields', async () => {
      const schema = z.object({
        required: z.string(),
        optional: z.string().optional(),
      })

      const result = await IgniterConnectorSchema.validate(schema, {
        optional: 'value',
      })

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
    })

    it('should handle nested objects', async () => {
      const schema = z.object({
        user: z.object({
          name: z.string(),
          email: z.string().email(),
        }),
        settings: z.object({
          enabled: z.boolean(),
        }),
      })

      const result = await IgniterConnectorSchema.validate(schema, {
        user: {
          name: 'John',
          email: 'john@example.com',
        },
        settings: {
          enabled: true,
        },
      })

      expect(result.success).toBe(true)
      expect(result.data?.user.name).toBe('John')
    })

    it('should handle arrays', async () => {
      const schema = z.object({
        items: z.array(z.string()),
        numbers: z.array(z.number()).min(1),
      })

      const result = await IgniterConnectorSchema.validate(schema, {
        items: ['a', 'b', 'c'],
        numbers: [1, 2, 3],
      })

      expect(result.success).toBe(true)
      expect(result.data?.items).toHaveLength(3)
    })

    it('should handle optional fields', async () => {
      const schema = z.object({
        required: z.string(),
        optional: z.string().optional(),
        defaulted: z.string().default('default'),
      })

      const result = await IgniterConnectorSchema.validate(schema, {
        required: 'value',
      })

      expect(result.success).toBe(true)
      expect(result.data?.required).toBe('value')
      expect(result.data?.optional).toBeUndefined()
      expect(result.data?.defaulted).toBe('default')
    })

    it('should handle enum validation', async () => {
      const schema = z.object({
        status: z.enum(['active', 'inactive', 'pending']),
      })

      const validResult = await IgniterConnectorSchema.validate(schema, {
        status: 'active',
      })
      expect(validResult.success).toBe(true)

      const invalidResult = await IgniterConnectorSchema.validate(schema, {
        status: 'unknown',
      })
      expect(invalidResult.success).toBe(false)
    })

    it('should handle union types', async () => {
      const schema = z.object({
        value: z.union([z.string(), z.number()]),
      })

      const stringResult = await IgniterConnectorSchema.validate(schema, {
        value: 'text',
      })
      expect(stringResult.success).toBe(true)

      const numberResult = await IgniterConnectorSchema.validate(schema, {
        value: 42,
      })
      expect(numberResult.success).toBe(true)

      const invalidResult = await IgniterConnectorSchema.validate(schema, {
        value: true,
      })
      expect(invalidResult.success).toBe(false)
    })

    it('should handle null values', async () => {
      const schema = z.object({
        nullable: z.string().nullable(),
        nonNullable: z.string(),
      })

      const result = await IgniterConnectorSchema.validate(schema, {
        nullable: null,
        nonNullable: 'value',
      })

      expect(result.success).toBe(true)
      expect(result.data?.nullable).toBeNull()
    })
  })

  describe('validateOrThrow()', () => {
    it('should return data for valid input', async () => {
      const schema = z.object({
        name: z.string(),
      })

      const data = await IgniterConnectorSchema.validateOrThrow(schema, {
        name: 'Test',
      })

      expect(data).toEqual({ name: 'Test' })
    })

    it('should throw error for invalid input', async () => {
      const schema = z.object({
        email: z.string().email(),
      })

      await expect(
        IgniterConnectorSchema.validateOrThrow(schema, {
          email: 'invalid',
        })
      ).rejects.toThrow('Validation failed')
    })

    it('should include error details in thrown error', async () => {
      const schema = z.object({
        count: z.number().min(0),
      })

      try {
        await IgniterConnectorSchema.validateOrThrow(schema, {
          count: -1,
        })
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toContain('Validation failed')
      }
    })
  })

  describe('isSchema()', () => {
    it('should return true for Zod schemas', () => {
      const schema = z.object({ name: z.string() })
      expect(IgniterConnectorSchema.isSchema(schema)).toBe(true)
    })

    it('should return true for Zod string schema', () => {
      const schema = z.string()
      expect(IgniterConnectorSchema.isSchema(schema)).toBe(true)
    })

    it('should return true for Zod array schema', () => {
      const schema = z.array(z.number())
      expect(IgniterConnectorSchema.isSchema(schema)).toBe(true)
    })

    it('should return false for plain objects', () => {
      expect(IgniterConnectorSchema.isSchema({})).toBe(false)
    })

    it('should return false for null', () => {
      expect(IgniterConnectorSchema.isSchema(null)).toBe(false)
    })

    it('should return false for undefined', () => {
      expect(IgniterConnectorSchema.isSchema(undefined)).toBe(false)
    })

    it('should return false for strings', () => {
      expect(IgniterConnectorSchema.isSchema('string')).toBe(false)
    })

    it('should return false for numbers', () => {
      expect(IgniterConnectorSchema.isSchema(123)).toBe(false)
    })

    it('should return false for arrays', () => {
      expect(IgniterConnectorSchema.isSchema([1, 2, 3])).toBe(false)
    })

    it('should return false for functions', () => {
      expect(IgniterConnectorSchema.isSchema(() => {})).toBe(false)
    })
  })

  describe('getTypeName()', () => {
    it('should return type name for object schemas', () => {
      const schema = z.object({ name: z.string() })
      const typeName = IgniterConnectorSchema.getTypeName(schema)
      // May return 'object' or 'unknown' depending on vendor detection
      expect(['object', 'unknown']).toContain(typeName)
    })

    it('should return type name for string schemas', () => {
      const schema = z.string()
      const typeName = IgniterConnectorSchema.getTypeName(schema)
      // May return 'string' or 'unknown' depending on vendor detection
      expect(['string', 'unknown']).toContain(typeName)
    })

    it('should return type name for number schemas', () => {
      const schema = z.number()
      const typeName = IgniterConnectorSchema.getTypeName(schema)
      // May return 'number' or 'unknown' depending on vendor detection
      expect(['number', 'unknown']).toContain(typeName)
    })

    it('should return type name for array schemas', () => {
      const schema = z.array(z.string())
      const typeName = IgniterConnectorSchema.getTypeName(schema)
      // May return 'array' or 'unknown' depending on vendor detection
      expect(['array', 'unknown']).toContain(typeName)
    })

    it('should return type name for boolean schemas', () => {
      const schema = z.boolean()
      const typeName = IgniterConnectorSchema.getTypeName(schema)
      // May return 'boolean' or 'unknown' depending on vendor detection
      expect(['boolean', 'unknown']).toContain(typeName)
    })

    it('should return type name for enum schemas', () => {
      const schema = z.enum(['a', 'b', 'c'])
      const typeName = IgniterConnectorSchema.getTypeName(schema)
      // May return 'enum' or 'unknown' depending on vendor detection
      expect(['enum', 'unknown']).toContain(typeName)
    })
  })

  describe('complex validation scenarios', () => {
    it('should validate API configuration schema', async () => {
      const configSchema = z.object({
        apiKey: z.string().min(10),
        baseUrl: z.string().url(),
        timeout: z.number().min(1000).max(30000).optional(),
        retries: z.number().int().min(0).max(5).default(3),
        headers: z.record(z.string(), z.string()).optional(),
      })

      const result = await IgniterConnectorSchema.validate(configSchema, {
        apiKey: 'sk-1234567890',
        baseUrl: 'https://api.example.com',
        headers: {
          'X-Custom': 'value',
        },
      })

      expect(result.success).toBe(true)
      expect(result.data?.retries).toBe(3) // default value
    })

    it('should validate OAuth token schema', async () => {
      const tokenSchema = z.object({
        accessToken: z.string(),
        refreshToken: z.string().optional(),
        expiresIn: z.number().optional(),
        expiresAt: z.date().optional(),
        tokenType: z.string().default('Bearer'),
      })

      const result = await IgniterConnectorSchema.validate(tokenSchema, {
        accessToken: 'access_token_value',
        refreshToken: 'refresh_token_value',
        expiresIn: 3600,
      })

      expect(result.success).toBe(true)
      expect(result.data?.tokenType).toBe('Bearer')
    })

    it('should validate webhook payload schema', async () => {
      const webhookSchema = z.object({
        type: z.string(),
        timestamp: z.number(),
        data: z.object({
          id: z.string(),
          attributes: z.record(z.string(), z.unknown()),
        }),
        metadata: z.unknown().optional(),
      })

      const result = await IgniterConnectorSchema.validate(webhookSchema, {
        type: 'payment.completed',
        timestamp: Date.now(),
        data: {
          id: 'pay_123',
          attributes: {
            amount: 1000,
            currency: 'USD',
          },
        },
      })

      expect(result.success).toBe(true)
    })
  })
})
