import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'CLI: `igniter generate` for Scaffolding & Schemas | Igniter.js',
  description:
    'Learn how to use the `igniter generate` command to accelerate development by scaffolding entire features from your database schema and generating a type-safe client.',
  keywords: [
    'Igniter.js',
    'igniter generate',
    'CLI',
    'code generation',
    'scaffolding',
    'schema-first',
    'Prisma',
    'Zod schema',
    'type-safe client',
    'developer tools',
  ],
  openGraph: {
    title: 'CLI: `igniter generate` for Scaffolding & Schemas | Igniter.js',
    description:
      'Master the `igniter generate` command to automatically create feature boilerplate from your database schema and generate a fully type-safe client for your frontend.',
    type: 'article',
    url: 'https://igniter.js.org/docs/cli-and-tooling/igniter-generate',
    images: [
      {
        url: 'https://igniter.js.org/og/docs-igniter-generate.png', // Assuming an OG image exists
        width: 1200,
        height: 630,
        alt: 'Igniter.js Code and Schema Generation',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CLI: `igniter generate` for Scaffolding & Schemas | Igniter.js',
    description:
      'Master the `igniter generate` command to automatically create feature boilerplate from your database schema and generate a fully type-safe client for your frontend.',
    images: ['https://igniter.js.org/og/docs-igniter-generate.png'],
  },
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
