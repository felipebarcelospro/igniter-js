import { MetadataRoute } from 'next';
import { FileSystemContentManager } from '@/lib/docs';
import { templates } from '@/app/(main)/templates/data/templates';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://igniterjs.com';

  // Static pages
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/docs`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/changelog`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/templates`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/stats`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms-of-use`,
      lastModified: new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    },
  ];

  // Get all content items (docs and blog)
  const allContent = await FileSystemContentManager.getAllNavigationItems();

  // Generate URLs for all content pages
  const contentPages = allContent.flatMap(section =>
    section.items.map(item => ({
      url: `${baseUrl}/${item.type}/${item.slug}`,
      lastModified: new Date(item.date),
      changeFrequency: item.type === 'blog' ? 'monthly' as const : 'weekly' as const,
      priority: item.type === 'blog' ? 0.7 : 0.8,
    }))
  );

  const templatePages = templates.map(template => ({
    url: `${baseUrl}/templates/${template.id}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [...staticPages, ...contentPages, ...templatePages];
}
