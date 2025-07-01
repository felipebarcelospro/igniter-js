import fs from 'fs/promises'
import path from 'path'
import { execa } from 'execa'
import ora from 'ora'
import chalk from 'chalk'
import type { ProjectSetupConfig } from './types'
import { 
  getFeatureDependencies, 
  DATABASE_CONFIGS 
} from './features'
import { generateAllTemplates } from './templates'
import { createChildLogger } from '../logger'

const logger = createChildLogger({ component: 'project-generator' })

/**
 * Main project generator class
 */
export class ProjectGenerator {
  private config: ProjectSetupConfig
  private targetDir: string
  private spinner = ora()

  constructor(config: ProjectSetupConfig, targetDir: string) {
    this.config = config
    this.targetDir = path.resolve(targetDir)
  }

  /**
   * Generate the complete project
   */
  async generate(): Promise<void> {
    try {
      logger.info('Starting project generation', { 
        project: this.config.projectName,
        targetDir: this.targetDir 
      })

      await this.createProjectStructure()
      await this.generateFiles()
      
      if (this.config.installDependencies) {
        await this.installDependencies()
      }
      
      if (this.config.initGit) {
        await this.initializeGit()
      }

      await this.runPostSetupTasks()
      
      this.showSuccessMessage()
      
    } catch (error) {
      this.spinner.fail(chalk.red('Project generation failed'))
      logger.error('Project generation failed', { error })
      throw error
    }
  }

  /**
   * Create project directory structure based on README.md structure
   */
  private async createProjectStructure(): Promise<void> {
    this.spinner.start('Creating project structure...')
    
    try {
      // Ensure target directory exists
      await fs.mkdir(this.targetDir, { recursive: true })
      
      // Create subdirectories following the README.md structure
      const dirs = [
        'src',
        'src/features',
        'src/features/example',
        'src/features/example/controllers',
        'src/features/example/procedures',
        'src/services'
      ]

      // Add presentation layers if framework supports it (Next.js, React-based)
      if (['nextjs', 'vite', 'remix'].includes(this.config.framework)) {
        dirs.push(
          'src/features/example/presentation',
          'src/features/example/presentation/components',
          'src/features/example/presentation/hooks',
          'src/features/example/presentation/contexts',
          'src/features/example/presentation/utils'
        )
      }

      if (this.config.database.provider !== 'none') {
        dirs.push('prisma')
      }

      for (const dir of dirs) {
        await fs.mkdir(path.join(this.targetDir, dir), { recursive: true })
      }

      this.spinner.succeed(chalk.green('✓ Project structure created'))
      logger.info('Project structure created successfully')
      
    } catch (error) {
      this.spinner.fail(chalk.red('✗ Failed to create project structure'))
      throw error
    }
  }

  /**
   * Generate all project files
   */
  private async generateFiles(): Promise<void> {
    this.spinner.start('Generating project files...')
    
    try {
      // Get dependencies
      const featureDeps = getFeatureDependencies(
        Object.entries(this.config.features).filter(([_, enabled]) => enabled).map(([key, _]) => key)
      )
      
      const dbConfig = DATABASE_CONFIGS[this.config.database.provider]
      const allDependencies = [
        '@igniter-js/core@*',
        'zod@3.25.48',
        ...featureDeps.dependencies.map(dep => `${dep.name}@${dep.version}`),
        ...dbConfig.dependencies.map(dep => `${dep.name}@${dep.version}`)
      ]
      
      const allDevDependencies = [
        'typescript@^5.6.3',
        '@types/node@^22.9.0',
        'tsx@^4.7.0',
        ...featureDeps.devDependencies.map(dep => `${dep.name}@${dep.version}`),
        ...(dbConfig.devDependencies || []).map(dep => `${dep.name}@${dep.version}`)
      ]

      // Generate templates
      const templates = generateAllTemplates(this.config, allDependencies, allDevDependencies)
      
      // Write files
      let writtenCount = 0
      for (const template of templates) {
        const filePath = path.join(this.targetDir, template.path)
        const dir = path.dirname(filePath)
        
        // Ensure directory exists
        await fs.mkdir(dir, { recursive: true })
        
        // Write file
        await fs.writeFile(filePath, template.content, 'utf8')
        
        // Make executable if needed
        if (template.executable) {
          await fs.chmod(filePath, '755')
        }
        
        writtenCount++
        this.spinner.text = `Generating files... (${writtenCount}/${templates.length})`
      }

      // Generate Prisma schema if using Prisma
      if (this.config.database.provider !== 'none') {
        await this.generatePrismaSchema()
      }

      this.spinner.succeed(chalk.green(`✓ Generated ${templates.length} files`))
      logger.info('Project files generated successfully', { fileCount: templates.length })
      
    } catch (error) {
      this.spinner.fail(chalk.red('✗ Failed to generate files'))
      throw error
    }
  }

  /**
   * Generate Prisma schema file
   */
  private async generatePrismaSchema(): Promise<void> {
    const { provider } = this.config.database
    
    let datasourceUrl = 'env("DATABASE_URL")'
    let providerName = provider === 'postgresql' ? 'postgresql' : provider === 'mysql' ? 'mysql' : 'sqlite'
    
    const schema = `// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "${providerName}"
  url      = ${datasourceUrl}
}
`

    const schemaPath = path.join(this.targetDir, 'prisma', 'schema.prisma')
    await fs.writeFile(schemaPath, schema, 'utf8')
  }

  /**
   * Install project dependencies
   */
  private async installDependencies(): Promise<void> {
    this.spinner.start(`Installing dependencies with ${this.config.packageManager}...`)

    try {
      const { command, args } = this.getInstallCommand()
      
      await execa(command, args, {
        cwd: this.targetDir,
        stdio: 'pipe'
      })

      this.spinner.succeed(chalk.green('✓ Dependencies installed'))
      
    } catch (error) {
      this.spinner.fail(chalk.red('✗ Failed to install dependencies'))
      throw error
    }
  }

  /**
   * Get install command based on package manager
   */
  private getInstallCommand(): { command: string; args: string[] } {
    switch (this.config.packageManager) {
      case 'yarn':
        return { command: 'yarn', args: ['install'] }
      case 'pnpm':
        return { command: 'pnpm', args: ['install'] }
      case 'bun':
        return { command: 'bun', args: ['install'] }
      default:
        return { command: 'npm', args: ['install'] }
    }
  }

  /**
   * Initialize git repository
   */
  private async initializeGit(): Promise<void> {
    this.spinner.start('Initializing Git repository...')

    try {
      await execa('git', ['init'], {
        cwd: this.targetDir,
        stdio: 'pipe'
      })

      await execa('git', ['add', '.'], {
        cwd: this.targetDir,
        stdio: 'pipe'
      })

      await execa('git', ['commit', '-m', 'Initial commit'], {
        cwd: this.targetDir,
        stdio: 'pipe'
      })

      this.spinner.succeed(chalk.green('✓ Git repository initialized'))
      
    } catch (error) {
      this.spinner.fail(chalk.red('✗ Failed to initialize Git repository'))
      logger.warn('Git initialization failed', { error })
    }
  }

  /**
   * Run post-setup tasks like Prisma generation
   */
  private async runPostSetupTasks(): Promise<void> {
    if (this.config.database.provider !== 'none') {
      this.spinner.start('Generating Prisma client...')

      try {
        const { command, args } = this.getRunCommand('db:generate')
        
        await execa(command, args, {
          cwd: this.targetDir,
          stdio: 'pipe'
        })

        this.spinner.succeed(chalk.green('✓ Prisma client generated'))
        
      } catch (error) {
        this.spinner.fail(chalk.red('✗ Failed to generate Prisma client'))
        logger.warn('Prisma client generation failed', { error })
      }
    }
  }

  /**
   * Get run command based on package manager
   */
  private getRunCommand(script: string): { command: string; args: string[] } {
    switch (this.config.packageManager) {
      case 'yarn':
        return { command: 'yarn', args: [script] }
      case 'pnpm':
        return { command: 'pnpm', args: ['run', script] }
      case 'bun':
        return { command: 'bun', args: ['run', script] }
      default:
        return { command: 'npm', args: ['run', script] }
    }
  }

  /**
   * Show success message with next steps
   */
  private showSuccessMessage(): void {
    console.log()
    console.log(chalk.green('✓ Success! Your Igniter.js project is ready!'))
    console.log()
    
    console.log(chalk.bold('Next steps:'))
    console.log(`  ${chalk.cyan('cd')} ${this.config.projectName}`)
    
    if (!this.config.installDependencies) {
      console.log(`  ${chalk.cyan(this.config.packageManager)} install`)
    }
    
    if (this.config.dockerCompose) {
      console.log(`  ${chalk.cyan('docker-compose')} up -d`)
    }
    
    if (this.config.database.provider !== 'none') {
      console.log(`  ${chalk.cyan(this.config.packageManager)} run db:push`)
    }
    
    console.log(`  ${chalk.cyan(this.config.packageManager)} run dev`)
    console.log()
    
    console.log(chalk.bold('Helpful commands:'))
    console.log(`  ${chalk.dim('Start development:')} ${chalk.cyan(`${this.config.packageManager} run dev`)}`)
    console.log(`  ${chalk.dim('Build for production:')} ${chalk.cyan(`${this.config.packageManager} run build`)}`)
    
    if (this.config.database.provider !== 'none') {
      console.log(`  ${chalk.dim('Database operations:')} ${chalk.cyan(`${this.config.packageManager} run db:studio`)}`)
    }
    
    console.log()
    console.log(chalk.dim('Happy coding!'))
  }
}

/**
 * Generate project with given configuration
 */
export async function generateProject(config: ProjectSetupConfig, targetDir: string): Promise<void> {
  const generator = new ProjectGenerator(config, targetDir)
  await generator.generate()
} 