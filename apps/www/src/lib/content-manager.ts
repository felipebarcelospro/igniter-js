import { type InferPageType, loader } from 'fumadocs-core/source';
import { docs, blog, updates, templates, learn, showcase } from '@/.source';
import { config } from '@/configs/application';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://igniterjs.com';

/**
 * Content type definitions
 */
export type ContentType = 'blog' | 'docs' | 'changelog' | 'learn' | 'showcase' | 'templates';

/**
 * Content source configuration
 */
export interface ContentSourceConfig {
  type: ContentType;
  source: ReturnType<typeof loader>;
  baseUrl: string;
  title: string;
  description: string;
}

/**
 * Page data with metadata
 */
export interface PageData {
  url: string;
  title: string;
  description?: string;
  lastModified?: Date;
  content?: string;
}

/**
 * ContentManager class to manage all content types
 * Provides unified access to RSS, sitemap, and LLM content generation
 */
export class ContentManager {
  private sources: Map<ContentType, ContentSourceConfig> = new Map();

  constructor() {
    // Initialize all content sources
    this.sources.set('blog', {
      type: 'blog',
      source: loader({
        baseUrl: '/blog',
        source: blog.toFumadocsSource(),
      }),
      baseUrl: '/blog',
      title: 'Blog',
      description: 'Articles, tutorials, and announcements from the Igniter.js team',
    });

    this.sources.set('docs', {
      type: 'docs',
      source: loader({
        baseUrl: '/docs',
        source: docs.toFumadocsSource(),
      }),
      baseUrl: '/docs',
      title: 'Documentation',
      description: 'Complete documentation for Igniter.js framework',
    });

    this.sources.set('changelog', {
      type: 'changelog',
      source: loader({
        baseUrl: '/changelog',
        source: updates.toFumadocsSource(),
      }),
      baseUrl: '/changelog',
      title: 'Changelog',
      description: 'Version updates and release notes',
    });

    this.sources.set('learn', {
      type: 'learn',
      source: loader({
        baseUrl: '/learn/course',
        source: learn.toFumadocsSource(),
      }),
      baseUrl: '/learn',
      title: 'Learn Course',
      description: 'Step-by-step tutorials to master Igniter.js',
    });

    this.sources.set('showcase', {
      type: 'showcase',
      source: loader({
        baseUrl: '/showcase',
        source: showcase.toFumadocsSource(),
      }),
      baseUrl: '/showcase',
      title: 'Showcase',
      description: 'Projects built with Igniter.js',
    });

    this.sources.set('templates', {
      type: 'templates',
      source: loader({
        baseUrl: '/templates',
        source: templates.toFumadocsSource(),
      }),
      baseUrl: '/templates',
      title: 'Templates',
      description: 'Starter templates and examples',
    });
  }

  /**
   * Get all pages for a specific content type
   */
  getPages(type: ContentType): InferPageType<ReturnType<typeof loader>>[] {
    const sourceConfig = this.sources.get(type);
    if (!sourceConfig) return [];
    return sourceConfig.source.getPages();
  }

  /**
   * Get all pages from all content types
   */
  getAllPages(): Array<{ type: ContentType; page: InferPageType<ReturnType<typeof loader>> }> {
    const allPages: Array<{ type: ContentType; page: InferPageType<ReturnType<typeof loader>> }> = [];
    
    for (const [type, sourceConfig] of this.sources.entries()) {
      const pages = sourceConfig.source.getPages();
      for (const page of pages) {
        allPages.push({ type, page });
      }
    }

    return allPages;
  }

  /**
   * Get source configuration for a content type
   */
  getSourceConfig(type: ContentType): ContentSourceConfig | undefined {
    return this.sources.get(type);
  }

  /**
   * Get all content types
   */
  getContentTypes(): ContentType[] {
    return Array.from(this.sources.keys());
  }

  /**
   * Get LLM text for a page
   */
  async getLLMText(page: InferPageType<ReturnType<typeof loader>>): Promise<string> {
    const processed = await (page.data as any).getText('processed');
    return `# ${page.data.title}

${page.data.description ? `> ${page.data.description}\n` : ''}URL: ${baseUrl}${page.url}

${processed}`;
  }

  /**
   * Get page data for RSS/Sitemap
   */
  async getPageData(page: InferPageType<ReturnType<typeof loader>>): Promise<PageData> {
    const description = page.data.description;
    const title = page.data.title;
    return {
      url: page.url,
      title: title || '',
      description: description ? description : undefined,
      lastModified: (page.data as any).lastModified ? new Date((page.data as any).lastModified) : undefined,
    };
  }

  /**
   * Get base URL
   */
  getBaseUrl(): string {
    return baseUrl;
  }

  /**
   * Get site metadata
   */
  getSiteMetadata() {
    return {
      title: config.projectName,
      description: config.projectDescription,
      url: baseUrl,
      author: config.creator.name,
      creator: config.creator.name,
      copyright: `© ${new Date().getFullYear()} ${config.projectName}. All rights reserved.`,
    };
  }
}

// Singleton instance
export const contentManager = new ContentManager();

