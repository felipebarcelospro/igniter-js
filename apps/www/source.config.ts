import {
  defineConfig,
  defineDocs,
  frontmatterSchema,
  metaSchema,
} from 'fumadocs-mdx/config';
import z from 'zod';

// You can customise Zod schemas for frontmatter and `meta.json` here
// see https://fumadocs.dev/docs/mdx/collections
export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: frontmatterSchema,
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema,
  },
});

export const blog = defineDocs({
  dir: 'content/blog',
  docs: {
    schema: frontmatterSchema.extend({
      cover: z.string().url().optional(),
      tags: z.array(z.string()).optional(),
    }),
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
})

export const updates = defineDocs({
  dir: 'content/updates',
  docs: {
    schema: frontmatterSchema.extend({
      cover: z.string().optional(),
    }),
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
})

export const templates = defineDocs({
  dir: 'content/templates',
  docs: {
    schema: frontmatterSchema.extend({
      framework: z.string(),
      demo: z.url(),
      repository: z.url().optional(),
      stack: z.array(z.string()),
      cover: z.string(),
      useCases: z.array(z.string()),
      creator: z.object({
        username: z.string(),
        name: z.string().optional(),
        avatar: z.url().optional(),
      }),
    }),
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
})

export const learn = defineDocs({
  dir: 'content/learn',
  docs: {
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema,
  },
})

export const showcase = defineDocs({
  dir: 'content/showcase',
  docs: {
    schema: frontmatterSchema.extend({
      image: z.string(),
      url: z.url(),
      repository: z.url().optional(),
      tech: z.array(z.string()),
      author: z.string(),
      featured: z.boolean().optional(),
      category: z.enum(['saas', 'ecommerce', 'enterprise', 'open-source', 'education', 'other']).optional(),
    }),
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
})

export default defineConfig({
  mdxOptions: {
    // MDX options
  },
});
