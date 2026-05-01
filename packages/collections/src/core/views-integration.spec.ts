
import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'node:path';
import { z } from 'zod';
import {
  IgniterCollections,
  IgniterCollectionModel,
  IgniterCollectionView,
  IgniterCollectionParser
} from '../index';
import { IgniterCollectionMockAdapter } from '../adapters/mock.adapter';
import type { IgniterCollectionViewDefinition } from '../types/view';

describe('Views System Integration (Global)', () => {
  let mockAdapter: IgniterCollectionMockAdapter;
  let mockTelemetry: any;
  let docs: any;
  const fixturesPath = path.resolve(__dirname, '../tests/fixtures/views');

  // Define global views for testing
  const views: IgniterCollectionViewDefinition[] = [
    {
      name: 'dashboard',
      title: 'Dashboard',
      description: 'Overview of all posts',
      tree: [
        { component: 'Metric', props: { title: 'Total' }, valuePath: '/stats/totalCount' }
      ],
      getData: async ({ manager }) => {
        const posts = await manager.posts.findMany();
        return {
          items: posts,
          stats: {
            totalCount: posts.length,
            totalViews: posts.reduce((sum: number, p: any) => sum + (p.views || 0), 0),
          }
        };
      },
      stats: {
        totalCount: { type: 'count' },
      }
    },
    {
      name: 'multi-collection',
      title: 'Multi Collection Dashboard',
      tree: [],
      getData: async ({ manager }) => {
        const [posts, authors] = await Promise.all([
          manager.posts.findMany(),
          manager.authors?.findMany?.() || Promise.resolve([]),
        ]);
        return {
          items: posts,
          stats: {
            totalPosts: posts.length,
            totalAuthors: authors.length,
          }
        };
      }
    },
    {
      name: 'actions-view',
      title: 'View with Actions',
      tree: [],
      getData: async ({ manager }) => ({ items: [] }),
      actions: {
        inline: {
          description: 'Inline action',
          handler: async ({ params }) => ({ success: true, data: { ok: true } })
        }
      }
    },
    {
      name: 'transformed',
      title: 'Transformed View',
      tree: [],
      getData: async ({ manager }) => {
        const posts = await manager.posts.findMany();
        return { items: posts };
      },
      transforms: [
        { type: 'group', field: 'category' }
      ]
    }
  ];

  beforeEach(async () => {
    mockAdapter = new IgniterCollectionMockAdapter();
    mockTelemetry = { emit: vi.fn() };

    // Seed data
    const items = [
      { id: '1', title: 'Post 1', views: 100, category: 'news', status: 'draft' },
      { id: '2', title: 'Post 2', views: 200, category: 'tech', status: 'draft' },
      { id: '3', title: 'Post 3', views: 300, category: 'news', status: 'draft' },
    ];

    for (const item of items) {
      const filePath = path.join(fixturesPath, `${item.id}.mdx`);
      mockAdapter.files.set(filePath, IgniterCollectionParser.serialize(item, 'Content', filePath));
    }

    const postsModel = IgniterCollectionModel.create('posts')
      .withPatterns(['{id}.mdx'])
      .build();

    docs = IgniterCollections.create()
      .withAdapter(mockAdapter)
      .withTelemetry(mockTelemetry)
      .withBasePath(fixturesPath)
      .addCollection(postsModel)
      .addView(views[0])
      .addView(views[1])
      .addView(views[2])
      .addView(views[3])
      .build();
  });

  describe('Global View Access', () => {
    it('should access views via global manager', () => {
      expect(docs.views).toBeDefined();
      expect(docs.views.list()).toHaveLength(4);
    });

    it('should render global view that accesses collection', async () => {
      const result = await docs.views.render('dashboard');

      expect(result.data.items).toHaveLength(3);
      expect(result.data.stats.totalCount).toBe(3);
      expect(result.view.name).toBe('dashboard');
    });

    it('should support multi-collection views', async () => {
      const result = await docs.views.render('multi-collection');

      expect(result.data.items).toHaveLength(3);
      expect(result.data.stats.totalPosts).toBe(3);
    });
  });

  describe('Data Hooks', () => {
    it('should execute getData hook with manager', async () => {
      const result = await docs.views.render('dashboard');

      expect(result.data.items).toHaveLength(3);
      expect(result.data.stats.totalViews).toBe(600);
    });
  });

  describe('Transforms', () => {
    it('should apply transforms sequentially', async () => {
      const result = await docs.views.render('transformed');

      // Grouped by category
      expect(result.data.items).toHaveProperty('news');
      expect(result.data.items).toHaveProperty('tech');
      expect((result.data.items as any).news).toHaveLength(2);
    });
  });

  describe('Actions System', () => {
    it('should list available actions for a view', () => {
      const actions = docs.views.listActions('actions-view');
      expect(actions).toContain('inline');
    });

    it('should execute inline action handler', async () => {
      const result = await docs.views.executeAction('actions-view', 'inline', {});
      expect(result.success).toBe(true);
      expect(result.data.ok).toBe(true);
    });

    it('should throw error for non-existent action', async () => {
      await expect(
        docs.views.executeAction('actions-view', 'unknown', {})
      ).rejects.toThrow(/Action not found/);
    });
  });

  describe('Telemetry Integration', () => {
    it('should emit telemetry events for rendering', async () => {
      const telemetrySpy = vi.spyOn(mockTelemetry, 'emit');

      await docs.views.render('dashboard');

      expect(telemetrySpy).toHaveBeenCalledWith('igniter.collections.view.render.started', expect.objectContaining({
        attributes: expect.objectContaining({
          'ctx.view.name': 'dashboard',
          'ctx.has_stats': true
        })
      }));

      expect(telemetrySpy).toHaveBeenCalledWith('igniter.collections.view.render.success', expect.objectContaining({
        attributes: expect.objectContaining({
          'ctx.view.name': 'dashboard',
          'ctx.items.count': 3
        })
      }));
    });

    it('should emit telemetry events for actions', async () => {
      const telemetrySpy = vi.spyOn(mockTelemetry, 'emit');

      await docs.views.executeAction('actions-view', 'inline', {});

      expect(telemetrySpy).toHaveBeenCalledWith('igniter.collections.view.action.started', expect.objectContaining({
        attributes: expect.objectContaining({
          'ctx.action.name': 'inline'
        })
      }));

      expect(telemetrySpy).toHaveBeenCalledWith('igniter.collections.view.action.success', expect.objectContaining({
        attributes: expect.objectContaining({
          'ctx.action.name': 'inline',
          'ctx.action.success': true
        })
      }));
    });

    it('should emit error telemetry when rendering fails', async () => {
      const telemetrySpy = vi.spyOn(mockTelemetry, 'emit');

      try {
        await docs.views.render('non-existent');
      } catch (e) {
        // ignore
      }

      expect(telemetrySpy).toHaveBeenCalledWith('igniter.collections.view.render.error', expect.objectContaining({
        attributes: expect.objectContaining({
          'ctx.error.code': 'VIEW_NOT_FOUND'
        })
      }));
    });
  });
});
