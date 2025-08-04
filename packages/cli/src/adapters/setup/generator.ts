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
  private isExistingProject: boolean
  private spinner = ora()

  constructor(config: ProjectSetupConfig, targetDir: string, isExistingProject: boolean) {
    this.config = config
    this.targetDir = path.resolve(targetDir)
    this.isExistingProject = isExistingProject
  }

  /**
   * Generate the complete project
   */
  async generate(): Promise<void> {
    try {
      logger.info('Starting project generation', {
        project: this.config.projectName,
        targetDir: this.targetDir,
        isExisting: this.isExistingProject,
      })

      if (!this.isExistingProject) {
        await this.createProjectStructure()
      } else {
        this.spinner.succeed(chalk.dim('✓ Existing project detected, skipping structure creation.'))
      }

      await this.generateFiles()

      if (this.config.installDependencies) {
        await this.installDependencies()
      }

      if (this.config.initGit && !this.isExistingProject) {
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

  private async downloadTemplate(): Promise<{ isStarter: boolean, success: boolean }> {
    const { framework } = this.config
    const templateUrl = `https://github.com/felipebarcelospro/igniter-js.git`
    const branch = 'main'
    const tempDir = path.join(this.targetDir, '__igniter_tmp__')
    const starterDir = path.join(tempDir, 'apps', framework)
    const destDir = this.targetDir

    let isValidStarter = false

    this.spinner.start(`Baixando apenas o conteúdo da pasta starter (${framework}) do branch ${branch}...`)

    try {
      // Remove tempDir if exists
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {})
      // Clone repo to tempDir
      await execa('git', [
        'clone',
        '--depth', '1',
        '--branch', branch,
        '--single-branch',
        templateUrl,
        tempDir
      ])
      // Verifica se starterDir existe
      const stat = await fs.stat(starterDir).catch(() => null)
      if (!stat || !stat.isDirectory()) {
        throw new Error('Diretório starter não encontrado no template clonado.')
      }

      isValidStarter = true

      // Copia todo o conteúdo de starterDir para destDir
      // Função recursiva para copiar arquivos e pastas
      const copyRecursive = async (src: string, dest: string) => {
        const entries = await fs.readdir(src, { withFileTypes: true })
        for (const entry of entries) {
          const srcPath = path.join(src, entry.name)
          const destPath = path.join(dest, entry.name)
          if (entry.isDirectory()) {
            await fs.mkdir(destPath, { recursive: true })
            await copyRecursive(srcPath, destPath)
          } else if (entry.isFile()) {
            await fs.copyFile(srcPath, destPath)
          }
        }
      }

      await copyRecursive(starterDir, destDir)

      // Remove tempDir
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {})

      this.spinner.succeed(chalk.dim('✓ Conteúdo da pasta starter copiado com sucesso'))
      return { isStarter: isValidStarter, success: true }
    } catch (error) {
      // try check from error if is valid

      console.error('Template download/copy failed', error)
      this.spinner.fail(chalk.red('Falha ao baixar/copiar o template starter'))
      logger.error('Template download/copy failed', { error })
      // Remove tempDir se deu erro
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {})
      return { isStarter: isValidStarter, success: false }
    }
  }

  /**
   * Create project directory structure based on README.md structure
   */
  private async createProjectStructure(): Promise<void> {
    this.spinner.start('Creating project structure...')

    try {
      const result = await this.downloadTemplate()
      if (result.isStarter) {
        if(result.success !== true) {
          throw new Error('Template download/copy failed')
        }

        if(result.success === true) {
          return
        }
      }

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
      const featureDeps = getFeatureDependencies(
        Object.entries(this.config.features)
          .filter(([_, enabled]) => enabled)
          .map(([key]) => key),
      )
      const dbConfig = DATABASE_CONFIGS[this.config.database.provider]

      const coreDependencies = [
        { name: '@igniter-js/core', version: '*' },
        { name: 'zod', version: '3.25.48' },
      ]

      const coreDevDependencies = [
        { name: 'typescript', version: '^5.6.3' },
        { name: '@types/node', version: '^22.9.0' },
        { name: 'tsx', version: '^4.7.0' },
      ]

      // We only need the dependencies for updating an existing package.json
      if (this.isExistingProject) {
        const deps = [...coreDependencies, ...featureDeps.dependencies, ...dbConfig.dependencies]
        const devDeps = [...coreDevDependencies, ...(featureDeps.devDependencies || []), ...(dbConfig.devDependencies || [])]
        await this.updatePackageJson(deps, devDeps)
      }

      // For new projects, dependencies are included in the template
      const allTemplates = generateAllTemplates(
        this.config,
        this.isExistingProject,
        [...coreDependencies, ...featureDeps.dependencies, ...dbConfig.dependencies].map(
          d => `${d.name}@${d.version}`,
        ),
        [
          ...coreDevDependencies,
          ...(featureDeps.devDependencies || []),
          ...(dbConfig.devDependencies || []),
        ].map(d => `${d.name}@${d.version}`),
      )

      let writtenCount = 0
      for (const template of allTemplates) {
        const filePath = path.join(this.targetDir, template.path)

        // For existing projects, be careful about overwriting files
        if (this.isExistingProject) {
          if (template.path === 'package.json') continue // Handled by updatePackageJson

          const fileExists = await fs.stat(filePath).catch(() => null)
          if (fileExists && ['.gitignore', 'README.md', 'tsconfig.json'].includes(path.basename(filePath))) {
            this.spinner.info(chalk.dim(`Skipping existing file: ${template.path}`))
            continue
          }
        }

        writtenCount++
        this.spinner.text = `Generating files... (${writtenCount}/${allTemplates.length})`
      }

      if (this.config.database.provider !== 'none') {
        await this.generatePrismaSchema()
      }

      this.spinner.succeed(chalk.green(`✓ Generated ${writtenCount} files`))
      logger.info('Project files generated successfully', { fileCount: writtenCount })
    } catch (error) {
      this.spinner.fail(chalk.red('✗ Failed to generate files'))
      throw error
    }
  }

  /**
   * Updates an existing package.json file with new dependencies and scripts.
   */
  private async updatePackageJson(
    dependencies: { name: string; version: string }[],
    devDependencies: { name: string; version: string }[],
  ): Promise<void> {
    const pkgJsonPath = path.join(this.targetDir, 'package.json')
    try {
      const pkgJsonContent = await fs.readFile(pkgJsonPath, 'utf-8')
      const pkgJson = JSON.parse(pkgJsonContent)

      this.spinner.text = 'Updating package.json...'

      // Add dependencies
      pkgJson.dependencies = pkgJson.dependencies || {}
      for (const dep of dependencies) {
        if (!pkgJson.dependencies[dep.name]) {
          pkgJson.dependencies[dep.name] = dep.version
        }
      }

      // Add dev dependencies
      pkgJson.devDependencies = pkgJson.devDependencies || {}
      for (const dep of devDependencies) {
        if (!pkgJson.devDependencies[dep.name]) {
          pkgJson.devDependencies[dep.name] = dep.version
        }
      }

      // Add database scripts if needed, without overwriting existing ones
      if (this.config.database.provider !== 'none') {
        pkgJson.scripts = pkgJson.scripts || {}
        const newScripts = {
          'db:generate': 'prisma generate',
          'db:push': 'prisma db push',
          'db:studio': 'prisma studio',
          'db:migrate': 'prisma migrate dev',
        }
        for (const [name, command] of Object.entries(newScripts)) {
          if (!pkgJson.scripts[name]) {
            pkgJson.scripts[name] = command
          }
        }
      }

      await fs.writeFile(pkgJsonPath, JSON.stringify(pkgJson, null, 2))
      this.spinner.succeed(chalk.green('✓ package.json updated'))
    } catch (error) {
      this.spinner.warn(chalk.yellow('Could not update package.json. Please add dependencies manually.'))
      logger.warn('Failed to update package.json', { error })
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
    await fs.mkdir(path.dirname(schemaPath), { recursive: true })
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
    if (this.isExistingProject) {
      console.log(chalk.green('✓ Success! Igniter.js has been added to your project!'))
    } else {
      console.log(chalk.green('✓ Success! Your Igniter.js project is ready!'))
    }
    console.log()

    console.log(chalk.bold('Next steps:'))
    if (!this.isExistingProject) {
      console.log(`  ${chalk.cyan('cd')} ${this.config.projectName}`)
    }

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

    if (this.isExistingProject) {
      console.log()
      console.log(chalk.yellow('Remember to integrate the Igniter router into your existing server setup!'))
    }

    console.log()
    console.log(chalk.dim('Happy coding!'))
  }
}

/**
 * Generate project with given configuration
 */
export async function generateProject(
  config: ProjectSetupConfig,
  targetDir: string,
  isExistingProject: boolean,
): Promise<void> {
  const generator = new ProjectGenerator(config, targetDir, isExistingProject)
  await generator.generate()
}
