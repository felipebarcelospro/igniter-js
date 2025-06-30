import type { 
  FeatureDefinition, 
  PackageDependency, 
  TemplateFile, 
  DockerService, 
  EnvVariable,
  DatabaseProvider 
} from './types'

/**
 * Feature definitions for easy extensibility
 * Each feature defines its dependencies, templates, and Docker services
 */
export const IGNITER_FEATURES: Record<string, FeatureDefinition> = {
  store: {
    key: 'store',
    name: 'Redis Store',
    description: 'Caching, sessions, and pub/sub messaging',
    dependencies: [
      { name: '@igniter-js/adapter-redis', version: '*' },
      { name: 'ioredis', version: '^5.6.1' }
    ],
    devDependencies: [
      { name: '@types/ioredis', version: '^4.28.10' }
    ],
    dockerServices: [
      {
        name: 'redis',
        image: 'redis:7-alpine',
        ports: ['6379:6379'],
        environment: {
          REDIS_PASSWORD: '',
        },
        volumes: ['redis_data:/data']
      }
    ],
    envVars: [
      { key: 'REDIS_URL', value: 'redis://localhost:6379', description: 'Redis connection URL' },
      { key: 'REDIS_HOST', value: 'localhost', description: 'Redis host' },
      { key: 'REDIS_PORT', value: '6379', description: 'Redis port' }
    ]
  },

  jobs: {
    key: 'jobs',
    name: 'BullMQ Jobs',
    description: 'Background task processing and job queues',
    dependencies: [
      { name: '@igniter-js/adapter-bullmq', version: '*' },
      { name: 'bullmq', version: '^5.0.0' },
      { name: 'ioredis', version: '^5.6.1' }
    ],
    devDependencies: [
      { name: '@types/ioredis', version: '^4.28.10' }
    ],
    dockerServices: [
      {
        name: 'redis',
        image: 'redis:7-alpine',
        ports: ['6379:6379'],
        environment: {
          REDIS_PASSWORD: '',
        },
        volumes: ['redis_data:/data']
      }
    ],
    envVars: [
      { key: 'REDIS_URL', value: 'redis://localhost:6379', description: 'Redis connection URL for jobs' },
      { key: 'QUEUE_PREFIX', value: 'igniter', description: 'Job queue prefix' }
    ]
  },

  mcp: {
    key: 'mcp',
    name: 'MCP Server',
    description: 'AI assistant integration with Model Context Protocol',
    dependencies: [
      { name: '@igniter-js/adapter-mcp', version: '*' },
      { name: '@vercel/mcp-adapter', version: '^0.2.0' },
      { name: '@modelcontextprotocol/sdk', version: '^1.10.2' }
    ],
    envVars: [
      { key: 'MCP_SERVER_URL', value: 'http://localhost:3000/mcp', description: 'MCP server endpoint' },
      { key: 'MCP_SESSION_TIMEOUT', value: '3600000', description: 'MCP session timeout in ms' }
    ]
  },

  logging: {
    key: 'logging',
    name: 'Enhanced Logging',
    description: 'Advanced console logging with structured output',
    dependencies: [
      { name: '@igniter-js/core', version: '*' }
    ],
    envVars: [
      { key: 'LOG_LEVEL', value: 'info', description: 'Logging level (debug, info, warn, error)' },
      { key: 'LOG_FORMAT', value: 'pretty', description: 'Log output format (pretty, json)' }
    ]
  }
}

/**
 * Database configurations with their dependencies and Docker services
 */
export const DATABASE_CONFIGS: Record<DatabaseProvider, {
  dependencies: PackageDependency[]
  devDependencies?: PackageDependency[]
  dockerService?: DockerService
  envVars: EnvVariable[]
  schema?: TemplateFile
}> = {
  none: {
    dependencies: [],
    envVars: []
  },

  postgresql: {
    dependencies: [
      { name: 'prisma', version: '6.0.0' },
      { name: '@prisma/client', version: '6.0.0' },
    ],
    dockerService: {
      name: 'postgres',
      image: 'postgres:16-alpine',
      ports: ['5432:5432'],
      environment: {
        POSTGRES_DB: '${DB_NAME}',
        POSTGRES_USER: '${DB_USER}',
        POSTGRES_PASSWORD: '${DB_PASSWORD}'
      },
      volumes: ['postgres_data:/var/lib/postgresql/data']
    },
    envVars: [
      { key: 'DATABASE_URL', value: 'postgresql://docker:docker@localhost:5432/docker', description: 'PostgreSQL connection string' },
      { key: 'DB_HOST', value: 'localhost', description: 'Database host' },
      { key: 'DB_PORT', value: '5432', description: 'Database port' },
      { key: 'DB_NAME', value: 'docker', description: 'Database name' },
      { key: 'DB_USER', value: 'docker', description: 'Database user' },
      { key: 'DB_PASSWORD', value: 'docker', description: 'Database password' }
    ]
  },

  mysql: {
    dependencies: [
      { name: 'prisma', version: '^5.0.0' },
      { name: '@prisma/client', version: '^5.0.0' },
      { name: 'mysql2', version: '^3.6.0' }
    ],
    dockerService: {
      name: 'mysql',
      image: 'mysql:8.0',
      ports: ['3306:3306'],
      environment: {
        MYSQL_ROOT_PASSWORD: '${DB_PASSWORD}',
        MYSQL_DATABASE: '${DB_NAME}',
        MYSQL_USER: '${DB_USER}',
        MYSQL_PASSWORD: '${DB_PASSWORD}'
      },
      volumes: ['mysql_data:/var/lib/mysql']
    },
    envVars: [
      { key: 'DATABASE_URL', value: 'mysql://docker:docker@localhost:3306/docker', description: 'MySQL connection string' },
      { key: 'DB_HOST', value: 'localhost', description: 'Database host' },
      { key: 'DB_PORT', value: '3306', description: 'Database port' },
      { key: 'DB_NAME', value: 'docker', description: 'Database name' },
      { key: 'DB_USER', value: 'docker', description: 'Database user' },
      { key: 'DB_PASSWORD', value: 'docker', description: 'Database password' }
    ]
  },

  sqlite: {
    dependencies: [
      { name: 'prisma', version: '6.0.0' },
      { name: '@prisma/client', version: '6.0.0' }
    ],
    envVars: [
      { key: 'DATABASE_URL', value: 'file:./dev.db', description: 'SQLite database file path' }
    ]
  },
}

/**
 * Get all dependencies for enabled features
 */
export function getFeatureDependencies(enabledFeatures: string[]): {
  dependencies: PackageDependency[]
  devDependencies: PackageDependency[]
} {
  const dependencies: PackageDependency[] = []
  const devDependencies: PackageDependency[] = []

  for (const featureKey of enabledFeatures) {
    const feature = IGNITER_FEATURES[featureKey]
    if (feature) {
      dependencies.push(...feature.dependencies)
      if (feature.devDependencies) {
        devDependencies.push(...feature.devDependencies)
      }
    }
  }

  // Remove duplicates
  const uniqueDeps = dependencies.filter((dep, index, self) =>
    index === self.findIndex(d => d.name === dep.name)
  )
  const uniqueDevDeps = devDependencies.filter((dep, index, self) =>
    index === self.findIndex(d => d.name === dep.name)
  )

  return {
    dependencies: uniqueDeps,
    devDependencies: uniqueDevDeps
  }
}

/**
 * Get Docker services for enabled features and database
 */
export function getDockerServices(
  enabledFeatures: string[], 
  databaseProvider: DatabaseProvider
): DockerService[] {
  const services: DockerService[] = []

  // Add feature services
  for (const featureKey of enabledFeatures) {
    const feature = IGNITER_FEATURES[featureKey]
    if (feature?.dockerServices) {
      services.push(...feature.dockerServices)
    }
  }

  // Add database service
  const dbConfig = DATABASE_CONFIGS[databaseProvider]
  if (dbConfig?.dockerService) {
    services.push(dbConfig.dockerService)
  }

  // Remove duplicate services (e.g., Redis used by both store and jobs)
  const uniqueServices = services.filter((service, index, self) =>
    index === self.findIndex(s => s.name === service.name)
  )

  return uniqueServices
}

/**
 * Get environment variables for enabled features and database
 */
export function getEnvironmentVariables(
  enabledFeatures: string[], 
  databaseProvider: DatabaseProvider,
  projectName: string
): EnvVariable[] {
  const envVars: EnvVariable[] = []

  // Add feature environment variables
  for (const featureKey of enabledFeatures) {
    const feature = IGNITER_FEATURES[featureKey]
    if (feature?.envVars) {
      envVars.push(...feature.envVars)
    }
  }

  // Add database environment variables
  const dbConfig = DATABASE_CONFIGS[databaseProvider]
  if (dbConfig?.envVars) {
    // Replace database name placeholder
    const dbEnvVars = dbConfig.envVars.map(envVar => ({
      ...envVar,
      value: envVar.value.replace('igniter_db', `${projectName.replace(/[^a-z0-9]/gi, '_')}_db`)
    }))
    envVars.push(...dbEnvVars)
  }

  // Remove duplicate environment variables
  const uniqueEnvVars = envVars.filter((envVar, index, self) =>
    index === self.findIndex(e => e.key === envVar.key)
  )

  return uniqueEnvVars
} 