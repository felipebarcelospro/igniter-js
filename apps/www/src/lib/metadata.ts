import { Metadata } from 'next';
import { config } from '@/configs/application';

export interface PageMetadata {
  title: string;
  description: string;
  keywords?: string[];
  canonical?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  section?: string;
}

/**
 * Generate comprehensive metadata for SEO optimization
 * This utility creates optimized meta tags following SEO best practices
 */
export function generateMetadata({
  title,
  description,
  keywords = [],
  canonical,
  ogImage,
  ogType = 'website',
  publishedTime,
  modifiedTime,
  author,
  section
}: PageMetadata): Metadata {
  const fullTitle = title === config.projectName ? title : `${title} | ${config.projectName}`;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://igniterjs.dev';
  const canonicalUrl = canonical ? `${baseUrl}${canonical}` : undefined;
  const defaultOgImage = `${baseUrl}/og-image.png`;
  
  // Ensure description is within optimal length (150-160 characters)
  const optimizedDescription = description.length > 160 
    ? description.substring(0, 157) + '...'
    : description;

  const metadata: Metadata = {
    title: fullTitle,
    description: optimizedDescription,
    keywords: keywords.length > 0 ? keywords.join(', ') : undefined,
    authors: author ? [{ name: author }] : [{ name: config.developerName }],
    creator: config.developerName,
    publisher: config.projectName,
    
    // Canonical URL
    alternates: canonicalUrl ? {
      canonical: canonicalUrl
    } : undefined,
    
    // Open Graph
    openGraph: {
      title: fullTitle,
      description: optimizedDescription,
      url: canonicalUrl,
      siteName: config.projectName,
      type: ogType,
      images: [{
        url: ogImage || defaultOgImage,
        width: 1200,
        height: 630,
        alt: `${config.projectName} - ${title}`
      }],
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
      ...(section && { section })
    },
    
    // Twitter Card
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: optimizedDescription,
      images: [ogImage || defaultOgImage],
      creator: config.twitterUrl ? `@${config.twitterUrl.split('/').pop()}` : undefined
    },
    
    // Additional meta tags
    other: {
      'theme-color': '#000000',
      'color-scheme': 'dark light',
      'format-detection': 'telephone=no'
    },
    
    // Robots
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1
      }
    }
  };

  return metadata;
}

/**
 * Generate metadata for blog posts
 */
export function generateBlogMetadata({
  title,
  description,
  slug,
  publishedTime,
  modifiedTime,
  author = config.developer.name,
  keywords = []
}: {
  title: string;
  description: string;
  slug: string;
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  keywords?: string[];
}): Metadata {
  return generateMetadata({
    title,
    description,
    canonical: `/blog/${slug}`,
    ogType: 'article',
    publishedTime,
    modifiedTime,
    author,
    section: 'Technology',
    keywords: [...keywords, 'Igniter.js', 'TypeScript', 'Full-stack', 'Framework']
  });
}

/**
 * Generate metadata for documentation pages
 */
export function generateDocsMetadata({
  title,
  description,
  slug,
  keywords = []
}: {
  title: string;
  description: string;
  slug: string;
  keywords?: string[];
}): Metadata {
  return generateMetadata({
    title,
    description,
    canonical: `/docs/${slug}`,
    keywords: [...keywords, 'Igniter.js', 'Documentation', 'TypeScript', 'API', 'Tutorial']
  });
}

/**
 * Generate structured data for articles
 */
export function generateArticleStructuredData({
  title,
  description,
  slug,
  publishedTime,
  modifiedTime,
  author = config.developer.name
}: {
  title: string;
  description: string;
  slug: string;
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://igniterjs.dev';
  
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    url: `${baseUrl}/blog/${slug}`,
    datePublished: publishedTime,
    dateModified: modifiedTime || publishedTime,
    author: {
      '@type': 'Person',
      name: author,
      url: config.developer.url
    },
    publisher: {
      '@type': 'Organization',
      name: config.projectName,
      url: baseUrl
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${baseUrl}/blog/${slug}`
    }
  };
}