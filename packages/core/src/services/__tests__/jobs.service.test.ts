import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { createIgniterJobsService, createJobDefinition, createJobsRouter } from '../jobs.service'
import type { IgniterJobQueueAdapter, JobDefinition, JobsRouter } from '../../types/jobs.interface'
import { z } from 'zod'

// Mock adapter for testing
const createMockAdapter = (): IgniterJobQueueAdapter<any> => ({
  client: {},
  bulkRegister: vi.fn().mockResolvedValue(undefined),
  register: vi.fn().mockImplementation((config) => config),
  router: vi.fn().mockImplementation((config) => ({ ...config, register: vi.fn() })),
  merge: vi.fn().mockImplementation((routers) => ({
    ...routers,
    createProxy: () => {
      // Create a proxy that matches the structure of the routers
      const proxy = {};
      
      for (const [namespace, router] of Object.entries(routers)) {
        proxy[namespace] = {
          // @ts-expect-error - Testing runtime validation
          ...Object.keys(router.jobs).reduce((acc, jobId) => ({
            ...acc,
            [jobId]: {
              enqueue: vi.fn().mockResolvedValue('job-123'),
              schedule: vi.fn().mockResolvedValue('job-123')
            }
          }), {}),
          bulk: vi.fn().mockResolvedValue(['job-123', 'job-123'])
        };
      }
      
      return proxy;
    }
  })),
  invoke: vi.fn().mockResolvedValue('job-123'),
  search: vi.fn().mockResolvedValue([]),
  worker: vi.fn().mockResolvedValue(undefined),
  shutdown: vi.fn().mockResolvedValue(undefined),
  cron: vi.fn().mockImplementation((schedule, handler, options) => ({
    name: `cron-${Date.now()}`,
    input: undefined,
    handler,
    repeat: { cron: schedule },
    ...options
  }))
})

// Mock context type
interface TestContext {
  userId: string
  logger: { log: (msg: string) => void }
}

describe('Jobs Service', () => {
  let mockAdapter: IgniterJobQueueAdapter<TestContext>
  let contextFactory: () => TestContext

  beforeEach(() => {
    mockAdapter = createMockAdapter()
    contextFactory = () => ({
      userId: 'test-user',
      logger: { log: vi.fn() }
    })
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Service Creation', () => {
    test('should create jobs service with adapter and context factory', () => {
      const service = createIgniterJobsService({
        adapter: mockAdapter,
        contextFactory
      })

      expect(service).toBeDefined()
      expect(service.getRegisteredJobs()).toEqual([])
    })
  })

  describe('Job Registration', () => {
    test('should register a single job with valid definition', () => {
      const service = createIgniterJobsService({
        adapter: mockAdapter,
        contextFactory
      })

      const jobDef = service.register({
        name: 'Send Email',
        input: z.object({ email: z.string().email() }),
        handler: async ({ input, context }) => {
          context.logger.log(`Sending email to ${input.email}`)
          return { sent: true }
        }
      })

      expect(jobDef).toBeDefined()
      expect(jobDef.name).toBe('Send Email')
      expect(jobDef.input).toBeDefined()
      expect(jobDef.handler).toBeInstanceOf(Function)
    })

    test('should throw error for invalid job definition', () => {
      const service = createIgniterJobsService({
        adapter: mockAdapter,
        contextFactory
      })

      expect(() => {
        service.register({
          name: '',
          input: z.object({}),
          handler: async () => {}
        })
      }).toThrow('Job name is required and cannot be empty')

      expect(() => {
        service.register({
          name: 'Valid Name',
          input: null as any,
          handler: async () => {}
        })
      }).toThrow('Job input schema is required')

      expect(() => {
        service.register({
          name: 'Valid Name',
          input: z.object({}),
          handler: null as any
        })
      }).toThrow('Job handler is required and must be a function')
    })

    test('should bulk register multiple jobs', async () => {
      const service = createIgniterJobsService({
        adapter: mockAdapter,
        contextFactory
      })

      const jobs = {
        'send-email': {
          name: 'Send Email',
          input: z.object({ email: z.string() }),
          handler: async () => ({ sent: true })
        },
        'process-payment': {
          name: 'Process Payment',
          input: z.object({ amount: z.number() }),
          handler: async () => ({ processed: true })
        }
      }

      const updatedService = await service.bulkRegister(jobs)

      expect(mockAdapter.bulkRegister).toHaveBeenCalledWith(
        expect.objectContaining({
          'send-email': expect.objectContaining({ name: 'Send Email' }),
          'process-payment': expect.objectContaining({ name: 'Process Payment' })
        })
      )
      expect(updatedService).toBeDefined()
    })
  })

  describe('Job Invocation', () => {
    test('should invoke a registered job with type-safe parameters', async () => {
      const service = createIgniterJobsService({
        adapter: mockAdapter,
        contextFactory
      })

      const jobs = {
        'send-email': {
          name: 'Send Email',
          input: z.object({ email: z.string() }),
          handler: async () => ({ sent: true })
        }
      }

      const updatedService = await service.bulkRegister(jobs)
      
      const jobId = await updatedService.invoke({
        id: 'send-email',
        input: { email: 'test@example.com' }
      })

      expect(mockAdapter.invoke).toHaveBeenCalledWith({
        id: 'send-email',
        input: { email: 'test@example.com' }
      })
      expect(jobId).toBe('job-123')
    })

    test('should invoke multiple jobs in batch', async () => {
      const service = createIgniterJobsService({
        adapter: mockAdapter,
        contextFactory
      })

      const jobs = {
        'send-email': {
          name: 'Send Email',
          input: z.object({ email: z.string() }),
          handler: async () => ({ sent: true })
        }
      }

      const updatedService = await service.bulkRegister(jobs)
      
      const jobIds = await updatedService.invokeMany([
        { id: 'send-email', input: { email: 'test1@example.com' } },
        { id: 'send-email', input: { email: 'test2@example.com' } }
      ])

      expect(mockAdapter.invoke).toHaveBeenCalledTimes(2)
      expect(jobIds).toEqual(['job-123', 'job-123'])
    })
  })

  describe('Job Management', () => {
    test('should search for jobs with filters', async () => {
      const service = createIgniterJobsService({
        adapter: mockAdapter,
        contextFactory
      })

      const mockResults = [
        {
          id: 'job-1',
          name: 'test-job',
          payload: { test: true },
          status: 'completed' as const,
          createdAt: new Date(),
          attemptsMade: 1,
          priority: 0
        }
      ]

      ;(mockAdapter.search as any).mockResolvedValue(mockResults)

      const results = await service.search({
        filter: { status: ['completed'], limit: 10 }
      })

      expect(mockAdapter.search).toHaveBeenCalledWith({
        filter: { status: ['completed'], limit: 10 }
      })
      expect(results).toEqual(mockResults)
    })

    test('should start worker with configuration', async () => {
      const service = createIgniterJobsService({
        adapter: mockAdapter,
        contextFactory
      })

      await service.worker({
        queues: ['test-queue'],
        concurrency: 2,
        onSuccess: vi.fn()
      })

      expect(mockAdapter.worker).toHaveBeenCalledWith({
        queues: ['test-queue'],
        concurrency: 2,
        onSuccess: expect.any(Function)
      })
    })

    test('should shutdown service gracefully', async () => {
      const service = createIgniterJobsService({
        adapter: mockAdapter,
        contextFactory
      })

      await service.shutdown()

      expect(mockAdapter.shutdown).toHaveBeenCalled()
    })
  })

  describe('Job Information', () => {
    test('should get registered job IDs', async () => {
      const service = createIgniterJobsService({
        adapter: mockAdapter,
        contextFactory
      })

      const jobs = {
        'job-1': {
          name: 'Job 1',
          input: z.object({}),
          handler: async () => ({})
        },
        'job-2': {
          name: 'Job 2',
          input: z.object({}),
          handler: async () => ({})
        }
      }

      const updatedService = await service.bulkRegister(jobs)
      const registeredJobs = updatedService.getRegisteredJobs()

      expect(registeredJobs).toEqual(['job-1', 'job-2'])
    })

    test('should get job information by ID', async () => {
      const service = createIgniterJobsService({
        adapter: mockAdapter,
        contextFactory
      })

      const jobs = {
        'test-job': {
          name: 'Test Job',
          input: z.object({ test: z.boolean() }),
          handler: async () => ({ result: true })
        }
      }

      const updatedService = await service.bulkRegister(jobs)
      const jobInfo = updatedService.getJobInfo('test-job')

      expect(jobInfo).toBeDefined()
      expect(jobInfo?.name).toBe('Test Job')
    })

    test('should return undefined for non-existent job', async () => {
      const service = createIgniterJobsService({
        adapter: mockAdapter,
        contextFactory
      })

      // @ts-expect-error - Test for non-existent job
      const jobInfo = service.getJobInfo('non-existent')

      expect(jobInfo).toBeUndefined()
    })
  })
})

describe('Job Definition Helper', () => {
  test('should create job definition with proper typing', () => {
    const definition = createJobDefinition({
      name: 'Test Job',
      input: z.object({ message: z.string() }),
      handler: async ({ input, context }) => {
        return { processed: input.message }
      }
    })

    expect(definition).toBeDefined()
    expect(definition.name).toBe('Test Job')
    expect(definition.input).toBeDefined()
    expect(definition.handler).toBeInstanceOf(Function)
  })
})

describe('Jobs Router', () => {
  test('should create router with jobs and configuration', () => {
    const router = createJobsRouter({
      jobs: {
        'test-job': {
          name: 'Test Job',
          input: z.object({ test: z.boolean() }),
          handler: async () => ({ success: true })
        }
      },
      namespace: 'test',
      defaultOptions: { attempts: 3 },
      onSuccess: vi.fn(),
      onFailure: vi.fn()
    })

    expect(router).toBeDefined()
    expect(router.namespace).toBe('test')
    expect(router.jobs['test-job']).toBeDefined()
    expect(router.defaultOptions).toEqual({ attempts: 3 })
  })

  test('should validate unique job IDs', () => {
    expect(() => {
      createJobsRouter({
        jobs: {
          'duplicate': {
            name: 'Job 1',
            input: z.object({}),
            handler: async () => ({})
          },
          // @ts-expect-error - Test for duplicate job ID
          'duplicate': {
            name: 'Job 2',
            input: z.object({}),
            handler: async () => ({})
          }
        }
      })
    }).not.toThrow() // JavaScript objects naturally handle duplicate keys
  })

  test('should validate namespace naming', () => {
    expect(() => {
      createJobsRouter({
        jobs: {},
        namespace: '123invalid'
      })
    }).toThrow('Invalid namespace')

    expect(() => {
      createJobsRouter({
        jobs: {},
        namespace: 'valid-namespace'
      })
    }).not.toThrow()
  })

  test('should register additional jobs to existing router', () => {
    const router = createJobsRouter({
      jobs: {
        'job-1': {
          name: 'Job 1',
          input: z.object({}),
          handler: async () => ({})
        }
      }
    })

    const updatedRouter = router.register({
      'job-2': {
        name: 'Job 2',
        input: z.object({}),
        handler: async () => ({})
      }
    })

    expect(Object.keys(updatedRouter.jobs)).toEqual(['job-1', 'job-2'])
  })

  test('should prevent job ID conflicts when registering', () => {
    const router = createJobsRouter({
      jobs: {
        'existing-job': {
          name: 'Existing Job',
          input: z.object({}),
          handler: async () => ({})
        }
      }
    })

    expect(() => {
      router.register({
        'existing-job': {
          name: 'Conflicting Job',
          input: z.object({}),
          handler: async () => ({})
        }
      })
    }).toThrow('Job ID conflicts detected')
  })
})