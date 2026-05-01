
import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'node:path';
import { z } from 'zod';
import {
  IgniterCollections,
  IgniterCollectionModel,
  IgniterCollectionParser
} from '../index';
import { IgniterCollectionMockAdapter } from '../adapters/mock.adapter';
import type { IgniterCollectionViewDefinition } from '../types/view';

describe('Views System Integration', () => {
  let mockAdapter: IgniterCollectionMockAdapter;
  let mockTelemetry: any;
  let docs: any;
  const fixturesPath = path.resolve(__dirname, '../tests/fixtures/views');

  // Define views for testing
  const views: IgniterCollectionViewDefinition[] = [
    {
      name: 'dashboard',
      title: 'Dashboard',
      description: 'Overview of all posts',
      tree: [
        { component: 'Metric', props: { title: 'Total' }, valuePath: '/stats/totalCount' }
      ],
      stats: {
        totalCount: { type: 'count' },
        totalViews: { type: 'sum', field: 'views' },
        avgViews: { type: 'avg', field: 'views' },
        maxViews: { type: 'max', field: 'views' },
        minViews: { type: 'min', field: 'views' },
        highEngagement: {
          type: 'custom',
          expression: 'items.filter(i => i.views > 150).length'
        }
      }
    },
    {
      name: 'analytics',
      title: 'Advanced Analytics',
      getData: 'hooks/analytics.ts',
      tree: []
    },
    {
      name: 'actions-view',
      title: 'View with Actions',
      tree: [],
      actions: {
        publish: {
          description: 'Publish a post',
          params: z.object({ postId: z.string() }) as any,
          handler: 'actions/publish.ts'
        },
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
      transforms: [
        { type: 'group', field: 'category' }
      ]
    }
  ];

  beforeEach(async () => {
    mockAdapter = new IgniterCollectionMockAdapter();
    mockTelemetry = { emit: vi.fn() };

    // Seed data with correct path and extension
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
      .withViews(views)
      .build();

    docs = IgniterCollections.create()
      .withAdapter(mockAdapter)
      .withTelemetry(mockTelemetry)
      .withBasePath(fixturesPath)
      .addCollection(postsModel)
      .build();
  });

  describe('Standard Rendering', () => {
    it('should calculate all declarative stats correctly', async () => {
      const result = await docs.posts.views.render('dashboard');

      console.log(result);

      expect(result.data.items).toHaveLength(3);
      expect(result.data.stats).toEqual({
        totalCount: 3,
        totalViews: 600,
        avgViews: 200,
        maxViews: 300,
        minViews: 100,
        highEngagement: 2
      });
      expect(result.view.name).toBe('dashboard');
    });

    it('should support query overrides during render', async () => {
      const result = await docs.posts.views.render('dashboard', {
        where: { category: 'news' }
      });

      expect(result.data.items).toHaveLength(2);
      expect(result.data.stats.totalCount).toBe(2);
      expect(result.data.stats.totalViews).toBe(400);
    });
  });

  describe('Data Hooks (File-based)', () => {
    it('should load and execute data hook from file', async () => {
      const result = await docs.posts.views.render('analytics');

      expect(result.data.items[0].enriched).toBe(true);
      expect(result.data.stats.customStat).toBe(100);
      expect(result.data.extra.source).toBe('file-hook');
    });
  });

  describe('Transforms', () => {
    it('should apply transforms sequentially', async () => {
      const result = await docs.posts.views.render('transformed');

      // Grouped by category
      expect(result.data.items).toHaveProperty('news');
      expect(result.data.items).toHaveProperty('tech');
      expect((result.data.items as any).news).toHaveLength(2);
    });
  });

  describe('Actions System', () => {
    it('should list available actions for a view', () => {
      const actions = docs.posts.views.listActions('actions-view');
      expect(actions).toContain('publish');
      expect(actions).toContain('inline');
    });

    it('should execute file-based action with parameter validation', async () => {
      const result = await docs.posts.views.executeAction('actions-view', 'publish', {
        postId: '1'
      });

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('published');
      expect(result.updates).toEqual({
        '/items/1/status': 'published'
      });
    });

    it('should execute inline action handler', async () => {
      const result = await docs.posts.views.executeAction('actions-view', 'inline', {});
      expect(result.success).toBe(true);
      expect(result.data.ok).toBe(true);
    });

    it('should throw validation error for invalid action parameters', async () => {
      await expect(
        docs.posts.views.executeAction('actions-view', 'publish', { invalid: 'prop' })
      ).rejects.toThrow(/Invalid action parameters/);
    });

    it('should throw error for non-existent action', async () => {
      await expect(
        docs.posts.views.executeAction('actions-view', 'unknown', {})
      ).rejects.toThrow(/Action not found/);
    });
  });

  describe('Telemetry Integration', () => {
    it('should emit telemetry events for rendering', async () => {
      const telemetrySpy = vi.spyOn(mockTelemetry, 'emit');

      await docs.posts.views.render('dashboard');

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

      await docs.posts.views.executeAction('actions-view', 'inline', {});

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
        await docs.posts.views.render('non-existent');
      } catch (e) {
        // ignore
      }

      expect(telemetrySpy).toHaveBeenCalledWith('igniter.collections.view.render.error', expect.objectContaining({
        attributes: expect.objectContaining({
          'ctx.error.code': 'COLLECTION_VIEW_NOT_FOUND'
        })
      }));
    });
  });

  describe('Type Inference (verified via compilation)', () => {
    it('should maintain type safety for view names', () => {
      type PostViews = {
        dashboard: IgniterCollectionViewDefinition;
        analytics: IgniterCollectionViewDefinition;
      };

      const typedDocs = IgniterCollections.create()
        .withAdapter(mockAdapter)
        .addCollection(
          IgniterCollectionModel.create<any, PostViews>('posts')
            .withViews(views)
            .build()
        )
        .build();

      typedDocs.posts.views.get('dashboard');
      typedDocs.posts.views.get('analytics');
    });
  });
});
