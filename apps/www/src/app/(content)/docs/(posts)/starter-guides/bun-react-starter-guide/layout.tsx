import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Bun + React Starter Guide | Igniter.js',
  description:
    'A comprehensive guide to building a high-performance, full-stack SPA with Igniter.js, using Bun as the server and runtime, and React for the frontend.',
  keywords: [
    'Igniter.js',
    'Bun',
    'React',
    'SPA',
    'full-stack starter',
    'performance',
    'type-safe API',
    'tutorial',
    'Bun.serve',
    'single page application',
  ],
  openGraph: {
    title: 'Full-Stack Guide: Building a High-Performance SPA with Bun, React, and Igniter.js',
    description:
      'Learn to build an ultra-fast, type-safe Single Page Application using the combined power of Bun, React, and Igniter.js.',
    type: 'article',
    url: 'https://igniterjs.com/docs/starter-guides/bun-react-starter-guide',
    images: [
      {
        url: 'https://igniterjs.com/og/docs-bun-react-starter.png', // Assuming an OG image exists
        width: 1200,
        height: 630,
        alt: 'Building a SPA with Bun, React, and Igniter.js',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Full-Stack Guide: Building a High-Performance SPA with Bun, React, and Igniter.js',
    description:
      'Learn to build an ultra-fast, type-safe Single Page Application using the combined power of Bun, React, and Igniter.js.',
    images: ['https://igniterjs.com/og/docs-bun-react-starter.png'],
  },
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
