import { generateSitemap } from '@/lib/sitemap';

export const revalidate = false;

/**
 * Sitemap.xml route
 */
export async function GET() {
  const sitemap = await generateSitemap();
  
  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}

