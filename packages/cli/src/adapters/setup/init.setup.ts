import fs from 'fs/promises'
import path from 'path'
import chalk from 'chalk'
import { runSetupPrompts, confirmOverwrite } from './prompts'
import { generateProject } from './generator'
import { createChildLogger } from '../logger'

const logger = createChildLogger({ component: 'init-setup' })

/**
 * Main init command handler
 */
export async function handleInitCommand(
  targetPath?: string,
  options: {
    force?: boolean
    template?: string
    packageManager?: string
  } = {}
): Promise<void> {
  try {
    // Determine target directory
    const targetDir = targetPath ? path.resolve(targetPath) : process.cwd();
    const isExistingProject = (await fs.stat(path.join(targetDir, 'package.json')).catch(() => null)) !== null;

    logger.info(`Starting Igniter.js project initialization (existing project: ${isExistingProject})`, {
      targetDir,
      options,
    });

    // If it's an existing project, welcome them back
    if (isExistingProject) {
      console.log();
      console.log(chalk.bold.blue('👋 Welcome back!'));
      console.log(chalk.dim("Let's add Igniter.js to your existing project..."));
      console.log();
    }

    // Check if directory has conflicting files
    if (!options.force) {
      const shouldContinue = await checkDirectoryAndConfirm(targetDir, isExistingProject);
      if (!shouldContinue) {
        console.log(chalk.yellow('✋ Init cancelled by user'));
        return;
      }
    }

    // Run interactive prompts. It will need to be smart about the targetDir.
    const config = await runSetupPrompts(targetDir);

    // The generator will also need to be smart about adding vs creating files.
    await generateProject(config, targetDir);

    logger.info('Project initialization completed successfully', {
      project: config.projectName,
      targetDir
    })

  } catch (error) {
    logger.error('Project initialization failed', { error })
    console.log(chalk.red('\n💥 Project initialization failed!'))
    console.log(chalk.red(error instanceof Error ? error.message : String(error)))
    process.exit(1)
  }
}

/**
 * Check if directory exists and is not empty, ask for confirmation
 */
async function checkDirectoryAndConfirm(
  targetDir: string,
  isExistingProject: boolean,
): Promise<boolean> {
  try {
    const stats = await fs.stat(targetDir);
    if (!stats.isDirectory()) {
      throw new Error(`Target path ${targetDir} is not a directory`);
    }

    if (isExistingProject) {
      const igniterCoreFile = path.join(targetDir, 'src', 'igniter.ts');
      if (await fs.stat(igniterCoreFile).catch(() => null)) {
        console.log(chalk.yellow('⚠️  It looks like Igniter.js might already be set up here.'));
        // The confirmOverwrite message is generic, so this console log adds context.
        return await confirmOverwrite(targetDir);
      }
      return true;
    }

    // For new projects, check if directory is not empty
    const entries = await fs.readdir(targetDir);
    const nonEmptyFiles = entries.filter(entry => {
      return (
        !entry.startsWith('.') &&
        !['README.md', 'LICENSE', 'node_modules', '.git'].includes(entry.toLowerCase())
      );
    });

    if (nonEmptyFiles.length > 0) {
      return await confirmOverwrite(targetDir);
    }

    return true;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // Directory doesn't exist, which is fine.
      return true;
    }
    throw error;
  }
}

/**
 * Initialize in current directory
 */
export async function initInCurrentDirectory(options: {
  force?: boolean
  packageManager?: string
} = {}): Promise<void> {
  await handleInitCommand(process.cwd(), options)
}

/**
 * Initialize in new directory
 */
export async function initInNewDirectory(
  projectName: string,
  options: {
    force?: boolean
    packageManager?: string
  } = {}
): Promise<void> {
  const targetDir = path.resolve(projectName)
  await handleInitCommand(targetDir, options)
}

/**
 * Validate project name
 */
export function validateProjectName(name: string): { valid: boolean; message?: string } {
  if (!name || !name.trim()) {
    return { valid: false, message: 'Project name is required' }
  }

  const trimmedName = name.trim()

  // Check for valid characters
  if (!/^[a-z0-9-_]+$/i.test(trimmedName)) {
    return {
      valid: false,
      message: 'Project name can only contain letters, numbers, hyphens, and underscores'
    }
  }

  // Check for reserved names
  const reservedNames = [
    'node_modules', 'package.json', 'dist', 'build', '.git', '.env',
    'src', 'public', 'static', 'assets', 'components', 'pages', 'api'
  ]

  if (reservedNames.includes(trimmedName.toLowerCase())) {
    return {
      valid: false,
      message: `'${trimmedName}' is a reserved name and cannot be used`
    }
  }

  // Check length
  if (trimmedName.length > 214) {
    return {
      valid: false,
      message: 'Project name cannot be longer than 214 characters'
    }
  }

  if (trimmedName.length < 2) {
    return {
      valid: false,
      message: 'Project name must be at least 2 characters long'
    }
  }

  return { valid: true }
}

/**
 * Show help information for init command
 */
export function showInitHelp(): void {
  console.log(chalk.bold('\n🔥 Igniter.js Init Command\n'))

  console.log(chalk.bold('Usage:'))
  console.log('  igniter init [project-name] [options]')
  console.log('  igniter init . [options]            # Initialize in current directory')
  console.log()

  console.log(chalk.bold('Examples:'))
  console.log('  igniter init my-api                 # Create new project')
  console.log('  igniter init .                      # Initialize current directory')
  console.log('  igniter init my-api --force         # Skip confirmation prompts')
  console.log()

  console.log(chalk.bold('Options:'))
  console.log('  --force           Skip confirmation prompts')
  console.log('  --pm <manager>    Package manager (npm, yarn, pnpm, bun)')
  console.log('  --help           Show this help message')
  console.log()

  console.log(chalk.bold('Features:'))
  console.log('  🗄️  Redis Store       Caching, sessions, pub/sub')
  console.log('  🔄 BullMQ Jobs       Background task processing')
  console.log('  🤖 MCP Server        AI assistant integration')
  console.log('  📝 Enhanced Logging  Structured console output')
  console.log('  📊 Telemetry        Tracking requests and errors')
  console.log()

  console.log(chalk.bold('Supported Frameworks:'))
  console.log('  • Next.js          • Express')
  console.log('  • Vite             • TanStack Start')
  console.log('  • Nuxt             • Astro')
  console.log('  • SvelteKit        • Generic')
  console.log('  • Remix')
  console.log()

  console.log(chalk.bold('Database Options:'))
  console.log('  • PostgreSQL + Prisma')
  console.log('  • MySQL + Prisma')
  console.log('  • SQLite + Prisma')
  console.log('  • MongoDB + Mongoose')
  console.log('  • None')
  console.log()
}
