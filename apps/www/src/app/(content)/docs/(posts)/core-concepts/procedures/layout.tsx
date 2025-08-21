import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Procedures: Type-Safe Middleware | Igniter.js',
  description:
    'Learn about Procedures in Igniter.js, the powerful, type-safe middleware pattern for handling authentication, logging, and other cross-cutting concerns while extending the context.',
  keywords: [
    'Igniter.js',
    'Procedures',
    'middleware',
    'type-safe',
    'authentication',
    'authorization',
    'rate limiting',
    'context extension',
    'backend development',
    'reusable logic',
  ],
  openGraph: {
    title: 'Procedures: Reusable, Type-Safe Middleware | Igniter.js',
    description:
      'Master Procedures, the Igniter.js implementation of middleware. Learn how to create reusable logic and dynamically extend the request context with full type safety.',
    type: 'article',
    url: 'https://igniterjs.com/docs/core-concepts/procedures',
    images: [
      {
        url: 'https://igniterjs.com/og/docs-procedures.png', // Assuming an OG image exists
        width: 1200,
        height: 630,
        alt: 'Creating Middleware with Procedures in Igniter.js',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Procedures: Reusable, Type-Safe Middleware | Igniter.js',
    description:
      'Master Procedures, the Igniter.js implementation of middleware. Learn how to create reusable logic and dynamically extend the request context with full type safety.',
    images: ['https://igniterjs.com/og/docs-procedures.png'],
  },
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
