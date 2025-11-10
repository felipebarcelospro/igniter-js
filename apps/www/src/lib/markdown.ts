import { contentManager } from '@/lib/content-manager';
import type { ContentType } from '@/lib/content-manager';

/**
 * Find page by URL path across all content types
 */
export async function findPageByPath(path: string) {
  // Remove leading/trailing slashes and extension
  const cleanPath = path.replace(/^\/+|\/+$/g, '').replace(/\.(mdx?|md)$/, '');
  
  const contentTypes: ContentType[] = ['blog', 'docs', 'changelog', 'learn', 'showcase', 'templates'];
  
  for (const type of contentTypes) {
    const sourceConfig = contentManager.getSourceConfig(type);
    if (!sourceConfig) continue;
    
    // Try to match the path
    const pages = contentManager.getPages(type);
    
    for (const page of pages) {
      // Normalize page URL - remove leading slash
      const pageUrl = page.url.replace(/^\/+/, '');
      
      // Try exact match first
      if (pageUrl === cleanPath) {
        return { type, page };
      }
      
      // Try with base URL prefix removed
      const pageUrlWithoutBase = pageUrl.replace(new RegExp(`^${sourceConfig.baseUrl.replace(/^\//, '')}/?`), '');
      const cleanPathWithoutBase = cleanPath.replace(new RegExp(`^${sourceConfig.baseUrl.replace(/^\//, '')}/?`), '');
      
      if (pageUrlWithoutBase === cleanPathWithoutBase && pageUrlWithoutBase) {
        return { type, page };
      }
      
      // Special handling: try matching slug patterns
      // For example: /blog/my-post should match blog post with slug 'my-post'
      const urlSegments = cleanPath.split('/');
      const pageSegments = pageUrl.split('/');
      
      // Last segment match (slug match)
      if (urlSegments.length > 0 && pageSegments.length > 0) {
        const lastUrlSegment = urlSegments[urlSegments.length - 1];
        const lastPageSegment = pageSegments[pageSegments.length - 1];
        
        if (lastUrlSegment === lastPageSegment && 
            urlSegments.slice(0, -1).join('/') === pageSegments.slice(0, -1).join('/')) {
          return { type, page };
        }
      }
    }
  }
  
  return null;
}

/**
 * Get markdown content for a page
 */
export async function getMarkdownContent(page: ReturnType<typeof contentManager.getPages>[0]): Promise<string> {
  const processed = await (page.data as any).getText('processed');
  
  // Add frontmatter-style header
  let content = `---\n`;
  content += `title: ${page.data.title}\n`;
  if (page.data.description) {
    content += `description: ${page.data.description}\n`;
  }
  const lastModified = (page.data as any).lastModified;
  if (lastModified) {
    content += `lastModified: ${new Date(lastModified).toISOString()}\n`;
  }
  content += `---\n\n`;
  content += `# ${page.data.title}\n\n`;
  
  if (page.data.description) {
    content += `${page.data.description}\n\n`;
  }
  
  content += processed;
  
  return content;
}

