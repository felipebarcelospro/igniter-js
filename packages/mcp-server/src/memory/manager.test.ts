import { describe, it, expect, beforeEach } from 'vitest';
import { createFileSystemService } from './fs';
import { createMdxParser } from './parser';
import { createMemoryManager } from './manager';
import * as path from 'path';
import * as fs from 'fs/promises';

describe('MemoryManager', () => {
  const tmpRoot = path.join(process.cwd(), '.tmp-mcp-manager-tests');
  const svc = createFileSystemService(tmpRoot);
  const parser = createMdxParser();
  const mm = createMemoryManager({ fs: svc, parser, projectRoot: tmpRoot });

  beforeEach(async () => {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  });

  it('stores and retrieves a memory', async () => {
    const filePath = await mm.store({
      type: 'insight',
      title: 'My Insight',
      content: '# Title\nBody',
      frontmatter: { tags: ['t1'], confidence: 0.8 },
    } as any);
    expect(filePath).toContain('.mdx');

    const id = path.basename(filePath, '.mdx');
    const item = await mm.getById('insight', id);
    expect(item?.title).toBe('Title');
  });

  it('lists by type and deletes', async () => {
    await mm.store({ type: 'insight', title: 'A', content: 'A' } as any);
    const files = await mm.listByType('insight');
    expect(files.length).toBeGreaterThanOrEqual(1);
    for (const f of files) {
      await mm.delete('insight', f.id);
    }
    const files2 = await mm.listByType('insight');
    expect(files2.length).toBe(0);
  });

  it('searches by content', async () => {
    await mm.store({ type: 'insight', title: 'Hello World', content: '# Hello\nWorld' } as any);
    const res = await mm.searchByContent({ text: 'hello' });
    expect(res.length).toBeGreaterThan(0);
  });

  it('fuzzy search finds near matches', async () => {
    await mm.store({ type: 'insight', title: 'Tokenizer', content: 'Tokenization' } as any);
    const res = await mm.fuzzySearch('tokenizr', 2);
    expect(res.length).toBeGreaterThan(0);
  });

  it('filters out sensitive by default', async () => {
    const p = await mm.store({ type: 'insight', title: 'S', content: 'secret', frontmatter: { sensitive: true } } as any);
    const id = path.basename(p, '.mdx');
    const res1 = await mm.searchByContent({ text: 'secret' });
    expect(res1.some((r) => r.memory.id === id)).toBe(false);
    const res2 = await mm.searchByContent({ text: 'secret', includeSensitive: true });
    expect(res2.some((r) => r.memory.id === id)).toBe(true);
  });

  it('creates periodic reflection', async () => {
    await mm.store({ type: 'insight', title: 'T', content: 'C', frontmatter: { tags: ['x','y'] } } as any);
    const p = await mm.createPeriodicReflection();
    expect(p).toContain('.mdx');
    const id = path.basename(p, '.mdx');
    const item = await mm.getById('reflection', id);
    expect(item?.content).toContain('Tag Distribution');
  });

  it('manages relationships in frontmatter', async () => {
    const aPath = await mm.store({ type: 'insight', title: 'A', content: 'A' } as any);
    const bPath = await mm.store({ type: 'insight', title: 'B', content: 'B' } as any);
    const aId = path.basename(aPath, '.mdx');
    const bId = path.basename(bPath, '.mdx');
    await mm.addRelationship({ type: 'insight', id: aId }, { type: 'insight', id: bId }, { type: 'uses', strength: 0.8, confidence: 0.9 });
    const aItem = await mm.getById('insight', aId);
    expect(aItem?.frontmatter.relationships?.length).toBe(1);
    const related = await mm.getDirectlyRelatedMemories({ type: 'insight', id: aId });
    expect(related.find((r) => r.id === bId)).toBeTruthy();
    await mm.removeRelationship({ type: 'insight', id: aId }, { type: 'insight', id: bId });
    const aItem2 = await mm.getById('insight', aId);
    expect(aItem2?.frontmatter.relationships?.length ?? 0).toBe(0);
  });

  it('generates mermaid relationship graph', async () => {
    const aPath = await mm.store({ type: 'insight', title: 'A', content: 'A' } as any);
    const bPath = await mm.store({ type: 'insight', title: 'B', content: 'B' } as any);
    const aId = path.basename(aPath, '.mdx');
    const bId = path.basename(bPath, '.mdx');
    await mm.addRelationship({ type: 'insight', id: aId }, { type: 'insight', id: bId }, { type: 'uses', strength: 0.8, confidence: 0.9 });
    const mermaid = await mm.generateRelationshipGraph({ type: 'insight', id: aId }, 1);
    expect(mermaid).toContain('graph TD');
    const from = aId.replace(/[^a-zA-Z0-9_]/g, '_');
    const to = bId.replace(/[^a-zA-Z0-9_]/g, '_');
    expect(mermaid.replace(/\s/g, '')).toContain(`${from}-->${to}`);
  });
});


