import { contentManager } from '@/lib/content-manager';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://igniterjs.com';

/**
 * Generate sitemap.xml for all pages
 */
export async function generateSitemap(): Promise<string> {
  const allPages = contentManager.getAllPages();
  
  const urls = allPages.map(({ page }) => {
    const lastMod = (page.data as any).lastModified 
      ? new Date((page.data as any).lastModified).toISOString()
      : new Date().toISOString();
    
    return `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
  });

  // Add static pages
  const staticPages = [
    { url: '/', priority: '1.0', changefreq: 'daily' },
    { url: '/blog', priority: '0.9', changefreq: 'daily' },
    { url: '/docs', priority: '0.9', changefreq: 'weekly' },
    { url: '/learn', priority: '0.9', changefreq: 'weekly' },
    { url: '/templates', priority: '0.8', changefreq: 'weekly' },
    { url: '/showcase', priority: '0.8', changefreq: 'weekly' },
    { url: '/changelog', priority: '0.7', changefreq: 'weekly' },
  ];

  const staticUrls = staticPages.map(({ url, priority, changefreq }) => {
    return `  <url>
    <loc>${baseUrl}${url}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls.join('\n')}
${urls.join('\n')}
</urlset>`;
}

