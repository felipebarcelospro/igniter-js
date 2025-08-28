import { describe, it, expect } from 'vitest';
import { createMdxParser } from './parser';
import type { MemoryItem } from './types';

describe('MdxParser', () => {
  const parser = createMdxParser();

  it('generates id from title and type', () => {
    const id = parser.generateMemoryId('Hello World!', 'insight');
    expect(id.startsWith('insight-hello-world')).toBe(true);
    const id2 = parser.generateMemoryId('Portuguese Communication', 'user_preference');
    expect(id2.startsWith('user-preferences-portuguese-communication')).toBe(true);
  });

  it('generates mdx content with frontmatter', () => {
    const item: MemoryItem = {
      id: 'insight-hello',
      type: 'insight',
      title: 'Hello',
      content: '# Hello\nBody',
      frontmatter: {
        id: 'insight-hello',
        type: 'insight',
        confidence: 0.9,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tags: ['tag'],
        source: 'user_input',
        project_root: '/tmp/project',
      },
    };
    const mdx = parser.generateMdxContent(item);
    expect(mdx).toContain('---');
    expect(mdx).toContain('id:');
    expect(mdx).toContain('# Hello');
  });

  it('parses content and validates', () => {
    const now = new Date().toISOString();
    const mdx = `---\nid: foo\ntype: insight\nconfidence: 0.9\ncreated_at: ${now}\nupdated_at: ${now}\ntags: []\nsource: user_input\nproject_root: /tmp/project\n---\n\n# Title\ncontent`;
    const item = parser.parseContent(mdx);
    expect(item.title).toBe('Title');
    const vr = parser.validateMemoryStructure(item);
    expect(vr.isValid).toBe(true);
  });
});


