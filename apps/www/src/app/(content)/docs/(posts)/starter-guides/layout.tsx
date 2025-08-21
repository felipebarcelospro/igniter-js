import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Starter Guides | Igniter.js',
  description:
    'Step-by-step guides for integrating Igniter.js with popular frameworks like Next.js, TanStack Start, Bun, and for building standalone REST APIs.',
  keywords: [
    'Igniter.js',
    'starter guides',
    'Next.js integration',
    'TanStack Start',
    'Bun integration',
    'REST API',
    'full-stack',
    'tutorial',
    'setup guide',
    'TypeScript',
  ],
  openGraph: {
    title: 'Starter Guides | Igniter.js',
    description:
      'Explore our comprehensive starter guides for setting up Igniter.js with your favorite frameworks and tools, including Next.js, TanStack Start, and Bun.',
    type: 'article',
    url: 'https://igniterjs.com/docs/starter-guides',
    images: [
      {
        url: 'https://igniterjs.com/og/docs-starter-guides.png', // Assuming an OG image exists
        width: 1200,
        height: 630,
        alt: 'Igniter.js Starter Guides',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Starter Guides | Igniter.js',
    description:
      'Explore our comprehensive starter guides for setting up Igniter.js with your favorite frameworks and tools, including Next.js, TanStack Start, and Bun.',
    images: ['https://igniterjs.com/og/docs-starter-guides.png'],
  },
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
