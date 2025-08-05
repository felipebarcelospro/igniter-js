import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Routing: Assembling Your API | Igniter.js',
  description:
    'Learn how to assemble your API using the Igniter.js Router. Combine controllers, configure base paths, and integrate with frameworks like Next.js for a unified, type-safe API.',
  keywords: [
    'Igniter.js',
    'Routing',
    'AppRouter',
    'API router',
    'basePATH',
    'baseURL',
    'Next.js integration',
    'Express integration',
    'type-safe API',
    'backend development',
  ],
  openGraph: {
    title: 'Routing: Assembling Your API | Igniter.js',
    description:
      'A guide to the final step of building your backend: assembling all your controllers into a single, routable API with the Igniter.js Router.',
    type: 'article',
    url: 'https://igniter.js.org/docs/core-concepts/routing',
    images: [
      {
        url: 'https://igniter.js.org/og/docs-routing.png', // Assuming an OG image exists
        width: 1200,
        height: 630,
        alt: 'Assembling an API with the Igniter.js Router',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Routing: Assembling Your API | Igniter.js',
    description:
      'A guide to the final step of building your backend: assembling all your controllers into a single, routable API with the Igniter.js Router.',
    images: ['https://igniter.js.org/og/docs-routing.png'],
  },
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
