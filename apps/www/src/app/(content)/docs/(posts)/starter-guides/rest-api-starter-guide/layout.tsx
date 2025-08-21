import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'REST API Starter Guide | Igniter.js',
  description:
    'A comprehensive guide to building high-performance, type-safe REST APIs with Igniter.js, covering starters for Express, Bun, and Deno.',
  keywords: [
    'Igniter.js',
    'REST API',
    'headless',
    'backend service',
    'Express',
    'Bun',
    'Deno',
    'type-safe API',
    'Prisma',
    'tutorial',
  ],
  openGraph: {
    title: 'Guide: Building High-Performance, Type-Safe REST APIs with Igniter.js',
    description:
      'Learn to build scalable, headless REST APIs using your choice of runtime (Express, Bun, Deno) with the structured, type-safe architecture of Igniter.js.',
    type: 'article',
    url: 'https://igniterjs.com/docs/starter-guides/rest-api-starter-guide',
    images: [
      {
        url: 'https://igniterjs.com/og/docs-rest-api-starter.png', // Assuming an OG image exists
        width: 1200,
        height: 630,
        alt: 'Building a REST API with Igniter.js',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Guide: Building High-Performance, Type-Safe REST APIs with Igniter.js',
    description:
      'Learn to build scalable, headless REST APIs using your choice of runtime (Express, Bun, Deno) with the structured, type-safe architecture of Igniter.js.',
    images: ['https://igniterjs.com/og/docs-rest-api-starter.png'],
  },
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
