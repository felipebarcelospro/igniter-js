import { generateRSSFeed, generateRSSFeedForType } from '@/lib/rss';
import type { ContentType } from '@/lib/content-manager';

export const revalidate = false;

/**
 * Main RSS feed route - all content types
 */
export async function GET() {
  const feed = await generateRSSFeed();
  
  return new Response(feed, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}

