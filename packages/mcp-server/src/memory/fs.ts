import * as nodeFs from 'fs/promises';
import * as path from 'path';

/**
 * Service responsible for all file-system interactions for the memory system.
 * Encapsulates directory structure handling, atomic writes, and project root resolution.
 */
export class FileSystemService {
  private readonly defaultProjectRoot: string;

  constructor(projectRoot?: string) {
    this.defaultProjectRoot = projectRoot ?? process.cwd();
  }

  /**
   * Resolves the project root by walking upwards to locate a marker file (.git or package.json).
   * Falls back to the provided default root if no marker is found.
   */
  async resolveProjectRoot(startDir: string = this.defaultProjectRoot): Promise<string> {
    let current: string = path.resolve(startDir);
    const root = path.parse(current).root;

    while (true) {
      const gitPath = path.join(current, '.git');
      const pkgPath = path.join(current, 'package.json');
      if (await this.pathExists(gitPath) || await this.pathExists(pkgPath)) {
        return current;
      }
      if (current === root) break;
      current = path.dirname(current);
    }
    return this.defaultProjectRoot;
  }

  /** Returns a conventional file path for a given memory ID and type directory. */
  getMemoryFilePath(projectRoot: string, typeDirName: string, id: string): string {
    return path.join(this.getMemoryTypeDir(projectRoot, typeDirName), `${id}.mdx`);
  }

  /** Returns the base memory directory path under .github/lia/memories. */
  getMemoryBaseDir(projectRoot: string): string {
    return path.resolve(projectRoot, '.github', 'lia', 'memories');
  }

  /** Returns the path to a specific memory type directory. */
  getMemoryTypeDir(projectRoot: string, typeDirName: string): string {
    return path.join(this.getMemoryBaseDir(projectRoot), typeDirName);
  }

  /** Ensures the directory structure for all memory categories exists. */
  async ensureDirectoryStructure(projectRoot: string): Promise<void> {
    const baseDir = this.getMemoryBaseDir(projectRoot);
    const typeDirs = [
      'patterns', 
      'decisions', 
      'preferences', 
      'insights', 
      'relationships', 
      'reflections',
      // Hierarchical project structure
      'project',
      'project/requirements',
      'project/designs', 
      'project/tasks',
      'project/bugs',
      // Background job management
      'jobs'
    ];
    await nodeFs.mkdir(baseDir, { recursive: true });
    await Promise.all(typeDirs.map((dir) => nodeFs.mkdir(path.join(baseDir, dir), { recursive: true })));
  }

  /** Checks whether a path exists. */
  async pathExists(targetPath: string): Promise<boolean> {
    try {
      await nodeFs.access(targetPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Writes a file atomically to avoid partial writes on failure.
   * Creates the directory if it does not exist.
   */
  async writeFileAtomic(filePath: string, content: string): Promise<void> {
    const dir = path.dirname(filePath);
    await nodeFs.mkdir(dir, { recursive: true });
    const tempPath = path.join(dir, `${path.basename(filePath)}.tmp-${Date.now()}`);
    await nodeFs.writeFile(tempPath, content, 'utf-8');
    await nodeFs.rename(tempPath, filePath);
  }

  /** Reads a UTF-8 text file. */
  async readFileUtf8(filePath: string): Promise<string> {
    return nodeFs.readFile(filePath, 'utf-8');
  }

  /** Lists files in a directory; returns absolute paths filtered by extension if provided. */
  async listFiles(dirPath: string, opts?: { ext?: string }): Promise<string[]> {
    const entries = await nodeFs.readdir(dirPath, { withFileTypes: true });
    const files = entries.filter((e) => e.isFile()).map((e) => path.join(dirPath, e.name));
    if (opts?.ext) return files.filter((f) => f.toLowerCase().endsWith(opts.ext!.toLowerCase()));
    return files;
  }

  /** Deletes a file if exists. */
  async deleteFile(filePath: string): Promise<void> {
    try {
      await nodeFs.unlink(filePath);
    } catch (err: any) {
      if (err && err.code === 'ENOENT') return; // ignore
      throw err;
    }
  }

  /** Get all memory files of a specific type (non-recursive). */
  async getMemoriesByType(projectRoot: string, typeDirName: string): Promise<{ path: string; name: string }[]> {
    const typeDir = this.getMemoryTypeDir(projectRoot, typeDirName);
    if (!(await this.pathExists(typeDir))) return [];
    
    const files = await this.listFiles(typeDir, { ext: '.mdx' });
    return files.map(filePath => ({
      path: filePath,
      name: path.basename(filePath, '.mdx')
    }));
  }

  /** Get all memory files of a specific type (recursive search for hierarchical organization). */
  async getMemoriesByTypeRecursive(projectRoot: string, typeDirName: string): Promise<{ path: string; name: string }[]> {
    const typeDir = this.getMemoryTypeDir(projectRoot, typeDirName);
    if (!(await this.pathExists(typeDir))) return [];
    
    const files: { path: string; name: string }[] = [];
    await this.collectMdxFilesRecursive(typeDir, files);
    return files;
  }

  /** Recursively collect all .mdx files in a directory tree. */
  private async collectMdxFilesRecursive(dirPath: string, files: { path: string; name: string }[]): Promise<void> {
    try {
      const entries = await nodeFs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          // Recursively search subdirectories
          await this.collectMdxFilesRecursive(fullPath, files);
        } else if (entry.isFile() && entry.name.endsWith('.mdx')) {
          files.push({
            path: fullPath,
            name: path.basename(entry.name, '.mdx')
          });
        }
      }
    } catch (error) {
      // Ignore errors in individual directories
    }
  }
}

/** Factory for FileSystemService with optional projectRoot override. */
export function createFileSystemService(projectRoot?: string): FileSystemService {
  return new FileSystemService(projectRoot);
}