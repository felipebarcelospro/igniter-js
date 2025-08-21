import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Advanced Features | Igniter.js',
  description:
    'Explore advanced Igniter.js features like background job queues, caching with the Store adapter, real-time communication via WebSockets, and how to extend functionality with plugins.',
  keywords: [
    'Igniter.js',
    'advanced features',
    'background jobs',
    'queues',
    'caching',
    'pub/sub',
    'store',
    'realtime',
    'WebSockets',
    'plugins',
  ],
  openGraph: {
    title: 'Advanced Features | Igniter.js',
    description:
      'Dive deeper into the powerful, built-in features that make Igniter.js a complete ecosystem for modern TypeScript applications.',
    type: 'article',
    url: 'https://igniterjs.com/docs/advanced-features',
    images: [
      {
        url: 'https://igniterjs.com/og/docs-advanced-features.png', // Assuming an OG image exists
        width: 1200,
        height: 630,
        alt: 'Igniter.js Advanced Features',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Advanced Features | Igniter.js',
    description:
      'Dive deeper into the powerful, built-in features that make Igniter.js a complete ecosystem for modern TypeScript applications.',
    images: ['https://igniterjs.com/og/docs-advanced-features.png'],
  },
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
