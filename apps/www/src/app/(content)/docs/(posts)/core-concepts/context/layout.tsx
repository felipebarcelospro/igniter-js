import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Context: Dependency Injection & State | Igniter.js',
  description:
    'Learn how Igniter.js uses a dynamic, type-safe Context for dependency injection. Understand how to provide a base context and extend it with Procedures (middleware).',
  keywords: [
    'Igniter.js',
    'Context',
    'dependency injection',
    'DI',
    'application state',
    'Procedures',
    'middleware',
    'type-safe',
    'Prisma',
    'backend development',
  ],
  openGraph: {
    title: 'Context: The Heart of Your Application\'s State | Igniter.js',
    description:
      'Master the Igniter.js Context, the powerful, type-safe dependency injection system that allows you to compose application state and services with ease.',
    type: 'article',
    url: 'https://igniterjs.com/docs/core-concepts/context',
    images: [
      {
        url: 'https://igniterjs.com/og/docs-context.png', // Assuming an OG image exists
        width: 1200,
        height: 630,
        alt: 'Understanding Context in Igniter.js',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Context: The Heart of Your Application\'s State | Igniter.js',
    description:
      'Master the Igniter.js Context, the powerful, type-safe dependency injection system that allows you to compose application state and services with ease.',
    images: ['https://igniterjs.com/og/docs-context.png'],
  },
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
