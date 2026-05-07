import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'node:path';
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
        { component: 'Metric', props: { title: 'Total' }, valuePath: '/totalCount' }
      ],
      getData: async ({ manager }) => {
        const posts = await manager.posts.findMany();
        return {
          posts,
          totalCount: posts.length,
          totalViews: posts.reduce((sum: number, p: any) => sum + (p.views || 0), 0),
        };
      },
      metadata: { icon: 'chart', order: 1 }
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
          posts,
          authors,
          totalPosts: posts.length,
          totalAuthors: authors.length,
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
      name: 'custom-shape',
      title: 'Custom Data Shape',
      tree: [
        { component: 'Header', valuePath: '/title' },
        { component: 'List', valuePath: '/items' }
      ],
      getData: async ({ manager }) => {
        const posts = await manager.posts.findMany();
        return {
          title: 'Latest Posts',
          items: posts.map((p: any) => p.title)
        };
      }
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

      expect(result.data.posts).toHaveLength(3);
      expect(result.data.totalCount).toBe(3);
      expect(result.view.name).toBe('dashboard');
    });

    it('should support multi-collection views', async () => {
      const result = await docs.views.render('multi-collection');

      expect(result.data.posts).toHaveLength(3);
      expect(result.data.totalPosts).toBe(3);
    });

    it('should return custom data shapes from getData', async () => {
      const result = await docs.views.render('custom-shape');

      expect(result.data.title).toBe('Latest Posts');
      expect(result.data.items).toEqual(['Post 1', 'Post 2', 'Post 3']);
    });
  });

  describe('View Metadata', () => {
    it('should expose metadata in view definitions', () => {
      const view = docs.views.get('dashboard');
      expect(view?.definition.metadata).toEqual({ icon: 'chart', order: 1 });
    });

    it('should include metadata in list results', () => {
      const allViews = docs.views.list();
      const dashboard = allViews.find(v => v.name === 'dashboard');
      expect(dashboard?.metadata?.icon).toBe('chart');
      expect(dashboard?.metadata?.order).toBe(1);
    });

    it('should return undefined metadata if not set', () => {
      const view = docs.views.get('actions-view');
      expect(view?.metadata).toBeUndefined();
    });
  });

  describe('Data Hooks', () => {
    it('should execute getData hook with manager', async () => {
      const result = await docs.views.render('dashboard');

      expect(result.data.posts).toHaveLength(3);
      expect(result.data.totalViews).toBe(600);
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
          'ctx.has_actions': false
        })
      }));

      expect(telemetrySpy).toHaveBeenCalledWith('igniter.collections.view.render.success', expect.objectContaining({
        attributes: expect.objectContaining({
          'ctx.view.name': 'dashboard'
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
