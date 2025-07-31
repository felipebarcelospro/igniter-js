import RSS from 'rss';
import { FileSystemContentManager } from '@/lib/docs';
import { config } from '@/configs/application';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://igniterjs.dev';
  
  const feed = new RSS({
    title: `${config.projectName} Blog`,
    description: `${config.projectDescription} - Latest updates, tutorials, and insights about the type-safe full-stack framework.`,
    generator: 'RSS for Node and Next.js',
    feed_url: `${baseUrl}/feed.xml`,
    site_url: baseUrl,
    managingEditor: `${config.developerEmail} (${config.developerName})`,
    webMaster: `${config.developerEmail} (${config.developerName})`,
    copyright: `Copyright ${new Date().getFullYear()}, ${config.developerName}`,
    language: 'en-US',
    pubDate: new Date().toUTCString(),
    ttl: 60,
  });

  // Get blog posts
  const blogSections = await FileSystemContentManager.getNavigationItems('blog');
  const blogPosts = blogSections.flatMap(section => section.items)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 20); // Limit to 20 most recent posts

  // Add each blog post to the feed
  blogPosts.forEach(post => {
    feed.item({
      title: post.title,
      description: post.description,
      url: `${baseUrl}/blog/${post.slug}`,
      categories: [post.category],
      author: config.developerName,
      date: post.date,
    });
  });

  return new Response(feed.xml({ indent: true }), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}