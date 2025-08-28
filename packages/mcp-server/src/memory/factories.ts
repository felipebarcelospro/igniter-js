import { createFileSystemService, FileSystemService } from './fs';
import { createMdxParser, MdxParser } from './parser';
import { createMemoryManager, MemoryManager } from './manager';

/**
 * Creates the default MemoryManager with FileSystemService and MdxParser
 * bound to the provided (or detected) projectRoot.
 */
export function createDefaultMemoryManager(projectRoot?: string): MemoryManager {
  const fs: FileSystemService = createFileSystemService(projectRoot);
  const parser: MdxParser = createMdxParser();
  return createMemoryManager({ fs, parser, projectRoot });
}

export { FileSystemService, createFileSystemService };
export { MdxParser, createMdxParser };
export { MemoryManager, createMemoryManager };


