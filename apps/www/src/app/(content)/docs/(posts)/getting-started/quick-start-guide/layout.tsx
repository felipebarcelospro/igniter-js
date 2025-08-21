import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Quick Start Guide | Igniter.js',
  description:
    'A step-by-step tutorial to build your first fully type-safe API endpoint with Igniter.js in minutes. Learn to use `igniter init`, create controllers, and test your API.',
  keywords: [
    'Igniter.js',
    'quick start guide',
    'tutorial',
    'getting started',
    'hello world',
    'igniter init',
    'type-safe API',
    'backend framework',
    'Node.js',
    'TypeScript',
  ],
  openGraph: {
    title: 'Quick Start Guide | Igniter.js',
    description:
      'Your first step to mastering Igniter.js. This guide walks you through creating a new project and building your first API endpoint from scratch.',
    type: 'article',
    url: 'https://igniterjs.com/docs/getting-started/quick-start-guide',
    images: [
      {
        url: 'https://igniterjs.com/og/docs-quick-start.png', // Assuming an OG image exists
        width: 1200,
        height: 630,
        alt: 'Igniter.js Quick Start Guide',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Quick Start Guide | Igniter.js',
    description:
      'Your first step to mastering Igniter.js. This guide walks you through creating a new project and building your first API endpoint from scratch.',
    images: ['https://igniterjs.com/og/docs-quick-start.png'],
  },
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
