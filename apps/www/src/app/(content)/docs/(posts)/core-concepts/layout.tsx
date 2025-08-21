import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Core Concepts | Igniter.js',
  description:
    'Understand the fundamental building blocks of Igniter.js: the Builder pattern, Context for dependency injection, Controllers, Actions, Procedures (middleware), Routing, and Validation with Zod.',
  keywords: [
    'Igniter.js',
    'core concepts',
    'Igniter Builder',
    'Context',
    'dependency injection',
    'Controllers',
    'Actions',
    'Procedures',
    'middleware',
    'Routing',
    'Validation',
    'Zod',
  ],
  openGraph: {
    title: 'Core Concepts | Igniter.js',
    description:
      'Master the essential building blocks of every Igniter.js application, from the builder pattern and dependency injection to type-safe routing and validation.',
    type: 'article',
    url: 'https://igniterjs.com/docs/core-concepts',
    images: [
      {
        url: 'https://igniterjs.com/og/docs-core-concepts.png', // Assuming an OG image exists
        width: 1200,
        height: 630,
        alt: 'Igniter.js Core Concepts',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Core Concepts | Igniter.js',
    description:
      'Master the essential building blocks of every Igniter.js application, from the builder pattern and dependency injection to type-safe routing and validation.',
    images: ['https://igniterjs.com/og/docs-core-concepts.png'],
  },
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
