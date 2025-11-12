import { generateRSSFeedForType } from '@/lib/rss';
import type { ContentType } from '@/lib/content-manager';

export const revalidate = false;

/**
 * RSS feed for specific content type
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  const resolvedParams = await params;
  
  // Validate that type is a valid ContentType
  const validTypes: ContentType[] = ['blog', 'docs', 'changelog', 'learn', 'showcase', 'templates'];
  
  if (!validTypes.includes(resolvedParams.type as ContentType)) {
    return new Response('Content type not found', { status: 404 });
  }
  
  try {
    const feed = await generateRSSFeedForType(resolvedParams.type as ContentType);
    
    return new Response(feed, {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    return new Response('Content type not found', { status: 404 });
  }
}

