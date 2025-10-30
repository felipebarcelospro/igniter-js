import { Metadata } from 'next';
import { config } from '@/configs/application';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://igniterjs.com';

/**
 * Helper function to generate default metadata with OpenGraph images
 */
export function generateMetadataWithOG({
  title,
  description,
  path = '',
  ogImagePath,
  type = 'website',
}: {
  title: string;
  description: string;
  path?: string;
  ogImagePath?: string;
  type?: 'website' | 'article';
}): Metadata {
  const url = `${baseUrl}${path}`;
  const ogImage = ogImagePath 
    ? `${baseUrl}${ogImagePath}`
    : `${baseUrl}/og/default.png`;

  return {
    title,
    description,
    keywords: [
      'Igniter.js',
      'TypeScript',
      'Framework',
      'AI-native',
      'RPC',
      'Real-time',
      'Next.js',
      'Express',
      'Bun',
      config.projectName,
    ],
    authors: [{ name: config.creator.name, url: config.creator.url }],
    creator: config.creator.name,
    publisher: config.projectName,
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      type,
      locale: 'en_US',
      url,
      title,
      description,
      siteName: config.projectName,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      creator: config.twitterUrl?.replace('https://x.com/', '@') || '@igniterjs',
      images: [ogImage],
    },
    alternates: {
      canonical: url,
    },
  };
}

/**
 * Generate default site metadata
 */
export function getDefaultMetadata(): Metadata {
  return generateMetadataWithOG({
    title: `${config.projectName} - ${config.projectTagline}`,
    description: config.projectDescription,
    path: '/',
    ogImagePath: '/og/home.png',
  });
}

