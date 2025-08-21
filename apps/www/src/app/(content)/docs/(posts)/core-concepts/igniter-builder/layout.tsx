import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'The Igniter Builder: Application Foundation | Igniter.js',
  description:
    'Learn about the Igniter Builder, the fluent, type-safe API for composing your application. Understand how to configure context, services, and features like Store and Queues.',
  keywords: [
    'Igniter.js',
    'Igniter Builder',
    'builder pattern',
    'application setup',
    'type-safe',
    'fluent API',
    'dependency injection',
    'Context',
    'Store',
    'Queues',
    'Plugins',
  ],
  openGraph: {
    title: 'The Igniter Builder: Your Application\'s Foundation | Igniter.js',
    description:
      'Master the Igniter Builder, the core of every Igniter.js application. This guide covers the chainable API for a guided, type-safe configuration experience.',
    type: 'article',
    url: 'https://igniterjs.com/docs/core-concepts/igniter-builder',
    images: [
      {
        url: 'https://igniterjs.com/og/docs-igniter-builder.png', // Assuming an OG image exists
        width: 1200,
        height: 630,
        alt: 'The Igniter.js Builder Pattern',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Igniter Builder: Your Application\'s Foundation | Igniter.js',
    description:
      'Master the Igniter Builder, the core of every Igniter.js application. This guide covers the chainable API for a guided, type-safe configuration experience.',
    images: ['https://igniterjs.com/og/docs-igniter-builder.png'],
  },
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
