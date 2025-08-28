import { describe, it, expect, beforeEach } from 'vitest';
import { createFileSystemService } from './fs';
import * as path from 'path';
import * as fs from 'fs/promises';

describe('FileSystemService', () => {
  const tmpRoot = path.join(process.cwd(), '.tmp-mcp-fs-tests');
  const svc = createFileSystemService(tmpRoot);

  beforeEach(async () => {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  });

  it('ensures directory structure', async () => {
    await svc.ensureDirectoryStructure(tmpRoot);
    const base = svc.getMemoryBaseDir(tmpRoot);
    const exists = await svc.pathExists(base);
    expect(exists).toBe(true);
  });

  it('writes atomically and reads back', async () => {
    const file = path.join(tmpRoot, 'file.txt');
    await svc.writeFileAtomic(file, 'hello');
    const content = await svc.readFileUtf8(file);
    expect(content).toBe('hello');
  });

  it('lists .mdx files', async () => {
    const dir = path.join(tmpRoot, 'd');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'a.mdx'), '');
    await fs.writeFile(path.join(dir, 'b.txt'), '');
    const files = await svc.listFiles(dir, { ext: '.mdx' });
    expect(files.length).toBe(1);
  });
});


