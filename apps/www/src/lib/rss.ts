import { Feed } from 'feed';
import { contentManager } from '@/lib/content-manager';
import { config } from '@/configs/application';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://igniterjs.com';

/**
 * Generate RSS feed for all content types
 */
export async function generateRSSFeed(): Promise<string> {
  const siteMetadata = contentManager.getSiteMetadata();
  const feed = new Feed({
    title: siteMetadata.title,
    description: siteMetadata.description,
    id: `${baseUrl}/rss`,
    link: `${baseUrl}/rss`,
    language: 'en-US',
    image: `${baseUrl}/og/default.png`,
    favicon: `${baseUrl}/favicon.ico`,
    copyright: siteMetadata.copyright,
    feedLinks: {
      rss: `${baseUrl}/rss`,
      atom: `${baseUrl}/rss/atom`,
      json: `${baseUrl}/rss/json`,
    },
    author: {
      name: siteMetadata.author,
      link: config.creator.url,
    },
  });

  // Add items from all content types
  const allPages = contentManager.getAllPages();
  
  for (const { type, page } of allPages) {
    const pageData = await contentManager.getPageData(page);
    
    feed.addItem({
      id: `${baseUrl}${pageData.url}`,
      title: pageData.title,
      description: pageData.description || '',
      link: `${baseUrl}${pageData.url}`,
      date: pageData.lastModified || new Date(),
      category: [
        {
          name: type.charAt(0).toUpperCase() + type.slice(1),
        },
      ],
    });
  }

  return feed.rss2();
}

/**
 * Generate RSS feed for a specific content type
 */
export async function generateRSSFeedForType(type: 'blog' | 'docs' | 'changelog' | 'learn' | 'showcase' | 'templates'): Promise<string> {
  const siteMetadata = contentManager.getSiteMetadata();
  const sourceConfig = contentManager.getSourceConfig(type);
  
  if (!sourceConfig) {
    throw new Error(`Content type ${type} not found`);
  }

  const feed = new Feed({
    title: `${siteMetadata.title} - ${sourceConfig.title}`,
    description: sourceConfig.description,
    id: `${baseUrl}/rss/${type}`,
    link: `${baseUrl}/rss/${type}`,
    language: 'en-US',
    image: `${baseUrl}/og/default.png`,
    favicon: `${baseUrl}/favicon.ico`,
    copyright: siteMetadata.copyright,
    feedLinks: {
      rss: `${baseUrl}/rss/${type}`,
      atom: `${baseUrl}/rss/${type}/atom`,
      json: `${baseUrl}/rss/${type}/json`,
    },
    author: {
      name: siteMetadata.author,
      link: config.creator.url,
    },
  });

  const pages = contentManager.getPages(type);
  
  for (const page of pages) {
    const pageData = await contentManager.getPageData(page);
    
    feed.addItem({
      id: `${baseUrl}${pageData.url}`,
      title: pageData.title,
      description: pageData.description || '',
      link: `${baseUrl}${pageData.url}`,
      date: pageData.lastModified || new Date(),
    });
  }

  return feed.rss2();
}

