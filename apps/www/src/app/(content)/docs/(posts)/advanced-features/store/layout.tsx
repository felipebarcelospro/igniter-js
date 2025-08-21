import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Igniter.js Store: High-Performance Caching & Messaging',
  description:
    'Learn to use the Igniter.js Store for high-performance caching and Pub/Sub messaging. Leverage the Redis adapter to reduce database load and build event-driven features.',
  keywords: [
    'Igniter.js',
    'caching',
    'cache-aside',
    'Pub/Sub',
    'messaging',
    'Redis',
    'ioredis',
    'key-value store',
    'performance',
    'TypeScript',
  ],
  openGraph: {
    title: 'Igniter.js Store: High-Performance Caching & Messaging',
    description:
      'Master high-performance caching and decoupled messaging with the Igniter.js Store. This guide covers setup, caching patterns, and pub/sub for event-driven architecture.',
    type: 'article',
    url: 'https://igniterjs.com/docs/advanced-features/store',
    images: [
      {
        url: 'https://igniterjs.com/og/docs-store.png', // Assuming an OG image exists
        width: 1200,
        height: 630,
        alt: 'Igniter.js Store for Caching and Messaging',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Igniter.js Store: High-Performance Caching & Messaging',
    description:
      'Master high-performance caching and decoupled messaging with the Igniter.js Store. This guide covers setup, caching patterns, and pub/sub for event-driven architecture.',
    images: ['https://igniterjs.com/og/docs-store.png'],
  },
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
