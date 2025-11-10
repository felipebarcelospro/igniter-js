import { contentManager } from '@/lib/content-manager';
import { notFound } from 'next/navigation';

export const revalidate = false;

/**
 * Serve markdown content for any page by appending .mdx or .md
 * Follows Fumadocs pattern: https://fumadocs.dev/docs/ui/llms#mdx-extension
 * 
 * Route: /llms.mdx/[[...slug]]
 * Example URLs (via rewrites):
 * - /blog/my-post.mdx -> /llms.mdx/blog/my-post
 * - /docs/core/quick-start.mdx -> /llms.mdx/docs/core/quick-start
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug?: string[] }> }
) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug || [];
  
  if (slug.length === 0) {
    return notFound();
  }
  
  // Determine content type from first segment
  const firstSegment = slug[0];
  
  // Map URL segments to content types
  const typeMap: Record<string, 'blog' | 'docs' | 'changelog' | 'learn' | 'showcase' | 'templates'> = {
    'blog': 'blog',
    'docs': 'docs',
    'changelog': 'changelog',
    'learn': 'learn',
    'showcase': 'showcase',
    'templates': 'templates',
  };
  
  const contentType = typeMap[firstSegment];
  
  if (!contentType) {
    return notFound();
  }
  
  const sourceConfig = contentManager.getSourceConfig(contentType);
  if (!sourceConfig) {
    return notFound();
  }
  
  // Get the remaining slug segments based on content type structure
  let pageSlug: string[];
  
  if (contentType === 'blog') {
    // Blog uses single slug: [slug]
    // Rewrite sends: /llms.mdx/blog/my-post
    // So slug = ['blog', 'my-post'], we need just ['my-post']
    pageSlug = slug.slice(1);
  } else if (contentType === 'learn') {
    // Learn uses /learn/course as base URL
    // Rewrite sends: /llms.mdx/learn/course/01-creating-your-project
    // So slug = ['learn', 'course', '01-creating-your-project']
    // We need just ['01-creating-your-project']
    if (slug.length > 2 && slug[1] === 'course') {
      pageSlug = slug.slice(2);
    } else {
      pageSlug = slug.slice(1);
    }
  } else if (contentType === 'changelog') {
    // Changelog uses /changelog as base, slug is just the filename
    // Rewrite sends: /llms.mdx/changelog/v0.1.1
    // So slug = ['changelog', 'v0.1.1'], we need just ['v0.1.1']
    pageSlug = slug.slice(1);
  } else {
    // Docs, showcase, templates: use all remaining segments
    // Rewrite sends: /llms.mdx/docs/core/quick-start
    // So slug = ['docs', 'core', 'quick-start'], we need ['core', 'quick-start']
    pageSlug = slug.slice(1);
  }
  
  // Try to find the page
  const page = sourceConfig.source.getPage(pageSlug);
  
  if (!page) {
    return notFound();
  }
  
  // Get markdown content
  const llmText = await contentManager.getLLMText(page);
  
  return new Response(llmText, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}

/**
 * Generate static params for all pages
 */
export async function generateStaticParams() {
  const allPages = contentManager.getAllPages();
  const params: Array<{ slug: string[] }> = [];
  
  for (const { type, page } of allPages) {
    const sourceConfig = contentManager.getSourceConfig(type);
    if (!sourceConfig) continue;
    
    // Get the slug segments from the page URL
    const urlPath = page.url.replace(/^\//, '');
    const slugSegments = urlPath.split('/').filter(Boolean);
    
    params.push({
      slug: slugSegments,
    });
  }
  
  return params;
}
