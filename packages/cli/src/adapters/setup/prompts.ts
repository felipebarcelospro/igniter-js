import prompts from 'prompts'
import chalk from 'chalk'
import path from 'path'
import { detectFramework, detectPackageManager, getFrameworkList, type SupportedFramework } from '../framework/framework-detector'
import type { 
  ProjectSetupConfig, 
  IgniterFeatures, 
  DatabaseProvider, 
  PackageManager 
} from './types'

/**
 * ANSI Art and branding for Igniter.js
 */
const IGNITER_LOGO = `
${chalk.blue('┌')}${chalk.blue('─'.repeat(60))}${chalk.blue('┐')}
${chalk.blue('│')}${' '.repeat(20)}${chalk.bold.blue('⚡ IGNITER.JS')}${' '.repeat(19)}${chalk.blue('│')}
${chalk.blue('│')}${' '.repeat(15)}${chalk.dim('Type-safe API framework')}${' '.repeat(14)}${chalk.blue('│')}
${chalk.blue('└')}${chalk.blue('─'.repeat(60))}${chalk.blue('┘')}
`

/**
 * Welcome message with beautiful styling
 */
function showWelcome(): void {
  console.clear()
  console.log(IGNITER_LOGO)
  console.log()
  console.log(chalk.bold('Welcome to Igniter.js!'))
  console.log()
  console.log(chalk.dim('Let\'s setup your type-safe API layer with modern tooling.'))
  console.log(chalk.dim('This process will configure your project with everything you need.'))
  console.log()
}

/**
 * Enhanced prompts with better UX and validation
 */
export async function runSetupPrompts(targetDir?: string): Promise<ProjectSetupConfig> {
  showWelcome()

  // Auto-detect current environment
  const detectedFramework = detectFramework()
  const detectedPackageManager = detectPackageManager()
  const projectName = targetDir ? path.basename(path.resolve(targetDir)) : 'my-igniter-app'

  try {
    const answers = await prompts([
      {
        type: 'text',
        name: 'projectName',
        message: chalk.bold('• What will your project be called?'),
        initial: projectName,
        validate: (value: string) => {
          if (!value.trim()) return 'Project name is required'
          if (!/^[a-z0-9-_]+$/i.test(value.trim())) {
            return 'Project name can only contain letters, numbers, hyphens, and underscores'
          }
          return true
        },
        format: (value: string) => value.trim().toLowerCase().replace(/\s+/g, '-')
      },
      {
        type: 'select',
        name: 'framework',
        message: chalk.bold('• Which framework are you using?'),
        choices: [
          { 
            title: `${chalk.green('Next.js')} ${detectedFramework === 'nextjs' ? chalk.dim('(detected)'): ''}`, 
            value: 'nextjs' 
          },
          { 
            title: `${chalk.yellow('Vite')} ${detectedFramework === 'vite' ? chalk.dim('(detected)'): ''}`, 
            value: 'vite' 
          },
          { 
            title: `${chalk.cyan('Nuxt')} ${detectedFramework === 'nuxt' ? chalk.dim('(detected)'): ''}`, 
            value: 'nuxt' 
          },
          { 
            title: `${chalk.magenta('SvelteKit')} ${detectedFramework === 'sveltekit' ? chalk.dim('(detected)'): ''}`, 
            value: 'sveltekit' 
          },
          { 
            title: `${chalk.red('Remix')} ${detectedFramework === 'remix' ? chalk.dim('(detected)'): ''}`, 
            value: 'remix' 
          },
          { 
            title: `${chalk.white('Astro')} ${detectedFramework === 'astro' ? chalk.dim('(detected)'): ''}`, 
            value: 'astro' 
          },
          { 
            title: `${chalk.blue('Express')} ${detectedFramework === 'express' ? chalk.dim('(detected)'): ''}`, 
            value: 'express' 
          },
          { 
            title: `${chalk.magenta('TanStack Start')} ${detectedFramework === 'tanstack-start' ? chalk.dim('(detected)'): ''}`, 
            value: 'tanstack-start' 
          },
          { 
            title: chalk.gray('Generic/Other'), 
            value: 'generic' 
          }
        ],
        initial: getFrameworkChoiceIndex(detectedFramework)
      },
      {
        type: 'multiselect',
        name: 'features',
        message: chalk.bold('• Which Igniter.js features would you like to enable?'),
        choices: [
          {
            title: `${chalk.blue('Store (Redis)')}`,
            description: 'Caching, sessions, and pub/sub messaging',
            value: 'store'
          },
          {
            title: `${chalk.green('Jobs (BullMQ)')}`,
            description: 'Background task processing and job queues',
            value: 'jobs'
          },
          {
            title: `${chalk.magenta('MCP Server')}`,
            description: 'AI assistant integration with Model Context Protocol',
            value: 'mcp'
          },
          {
            title: `${chalk.yellow('Enhanced Logging')}`,
            description: 'Advanced console logging with structured output',
            value: 'logging',
            selected: true // Default selected
          },
          {
            title: `${chalk.yellow('Telemetry')}`,
            description: 'Telemetry for tracking requests and errors',
            value: 'telemetry',
            selected: true // Default selected
          }
        ],
        instructions: chalk.dim('Use ↑↓ to navigate, space to select, enter to confirm')
      },
      {
        type: 'select',
        name: 'database',
        message: chalk.bold('• Choose your database (optional):'),
        choices: [
          { 
            title: `${chalk.gray('None')} ${chalk.dim('- Start without database')}`, 
            value: 'none' 
          },
          { 
            title: `${chalk.blue('PostgreSQL + Prisma')} ${chalk.dim('- Production-ready')}`, 
            value: 'postgresql' 
          },
          { 
            title: `${chalk.blue('MySQL + Prisma')} ${chalk.dim('- Wide compatibility')}`, 
            value: 'mysql' 
          },
          { 
            title: `${chalk.green('SQLite + Prisma')} ${chalk.dim('- Local development')}`, 
            value: 'sqlite' 
          },
        ],
        initial: 0
      },
      {
        type: (prev: DatabaseProvider) => prev !== 'none' ? 'confirm' : null,
        name: 'dockerCompose',
        message: chalk.bold('• Setup Docker Compose for development?'),
        hint: chalk.dim('Includes Redis and your selected database'),
        initial: true
      },
      {
        type: 'select',
        name: 'packageManager',
        message: chalk.bold('• Which package manager?'),
        choices: [
          { 
            title: `${chalk.red('npm')} ${detectedPackageManager === 'npm' ? chalk.dim('(detected)'): ''}`, 
            value: 'npm' 
          },
          { 
            title: `${chalk.blue('yarn')} ${detectedPackageManager === 'yarn' ? chalk.dim('(detected)'): ''}`, 
            value: 'yarn' 
          },
          { 
            title: `${chalk.yellow('pnpm')} ${detectedPackageManager === 'pnpm' ? chalk.dim('(detected)'): ''}`, 
            value: 'pnpm' 
          },
          { 
            title: `${chalk.white('bun')} ${detectedPackageManager === 'bun' ? chalk.dim('(detected)'): ''}`, 
            value: 'bun' 
          }
        ],
        initial: getPackageManagerChoiceIndex(detectedPackageManager)
      },
      {
        type: 'confirm',
        name: 'initGit',
        message: chalk.bold('• Initialize Git repository?'),
        initial: true
      },
      {
        type: 'confirm',
        name: 'installDependencies',
        message: chalk.bold('• Install dependencies automatically?'),
        initial: true
      }
    ], {
      onCancel: () => {
        console.log(chalk.red('\n✗ Setup cancelled'))
        process.exit(0)
      }
    })

    // Convert features array to object
    const featuresObj: IgniterFeatures = {
      store: answers.features.includes('store'),
      jobs: answers.features.includes('jobs'),
      mcp: answers.features.includes('mcp'),
      logging: answers.features.includes('logging'),
      telemetry: answers.features.includes('telemetry')
    }

    const config: ProjectSetupConfig = {
      projectName: answers.projectName,
      framework: answers.framework,
      features: featuresObj,
      database: { provider: answers.database },
      packageManager: answers.packageManager,
      initGit: answers.initGit,
      installDependencies: answers.installDependencies,
      dockerCompose: answers.dockerCompose || false
    }

    // Show configuration summary
    showConfigSummary(config)

    return config

  } catch (error) {
    if (error instanceof Error && error.message === 'canceled') {
      console.log(chalk.red('\n✗ Setup interrupted'))
      process.exit(0)
    }
    throw error
  }
}

/**
 * Show configuration summary to user
 */
function showConfigSummary(config: ProjectSetupConfig): void {
  console.log()
  console.log(chalk.bold('Configuration Summary:'))
  console.log(chalk.dim('─'.repeat(40)))
  console.log(`${chalk.cyan('Project:')} ${config.projectName}`)
  console.log(`${chalk.cyan('Framework:')} ${config.framework}`)
  
  const enabledFeatures = Object.entries(config.features)
    .filter(([_, enabled]) => enabled)
    .map(([key, _]) => key)
  
  if (enabledFeatures.length > 0) {
    console.log(`${chalk.cyan('Features:')} ${enabledFeatures.join(', ')}`)
  }
  
  if (config.database.provider !== 'none') {
    console.log(`${chalk.cyan('Database:')} ${config.database.provider}`)
  }
  
  console.log(`${chalk.cyan('Package Manager:')} ${config.packageManager}`)
  console.log(`${chalk.cyan('Git:')} ${config.initGit ? 'Yes' : 'No'}`)
  console.log(`${chalk.cyan('Install Dependencies:')} ${config.installDependencies ? 'Yes' : 'No'}`)
  
  if (config.dockerCompose) {
    console.log(`${chalk.cyan('Docker Compose:')} Yes`)
  }
  
  console.log()
}

/**
 * Helper to get framework choice index
 */
function getFrameworkChoiceIndex(detected: SupportedFramework): number {
  const frameworks = ['nextjs', 'vite', 'nuxt', 'sveltekit', 'remix', 'astro', 'express', 'tanstack-start', 'generic']
  return Math.max(0, frameworks.indexOf(detected))
}

/**
 * Helper to get package manager choice index  
 */
function getPackageManagerChoiceIndex(detected: PackageManager): number {
  const managers = ['npm', 'yarn', 'pnpm', 'bun']
  return Math.max(0, managers.indexOf(detected))
}

export async function confirmOverwrite(targetPath: string): Promise<boolean> {
  const { overwrite } = await prompts({
    type: 'confirm',
    name: 'overwrite',
    message: `Directory ${chalk.cyan(targetPath)} already exists. Overwrite?`,
    initial: false
  })
  
  return overwrite
} 