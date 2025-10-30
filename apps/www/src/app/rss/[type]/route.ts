import { generateRSSFeedForType } from '@/lib/rss';
import type { ContentType } from '@/lib/content-manager';

export const revalidate = false;

/**
 * RSS feed for specific content type
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: ContentType }> }
) {
  const resolvedParams = await params;
  try {
    const feed = await generateRSSFeedForType(resolvedParams.type);
    
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

