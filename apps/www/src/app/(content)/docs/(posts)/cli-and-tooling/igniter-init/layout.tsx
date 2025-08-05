import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'CLI: Scaffolding with `igniter init` | Igniter.js',
  description:
    'Learn how to use the `igniter init` command to scaffold a new, production-ready Igniter.js project in minutes with an interactive setup for frameworks, features, and database configuration.',
  keywords: [
    'Igniter.js',
    'igniter init',
    'CLI',
    'scaffolding',
    'project setup',
    'boilerplate',
    'Next.js',
    'Express',
    'Prisma',
    'Docker',
    'code generation',
  ],
  openGraph: {
    title: 'CLI: Scaffolding with `igniter init` | Igniter.js',
    description:
      'Get your project started in minutes. This guide covers how `igniter init` scaffolds your application with a feature-based architecture, interactive setup, and optional Docker integration.',
    type: 'article',
    url: 'https://igniter.js.org/docs/cli-and-tooling/igniter-init',
    images: [
      {
        url: 'https://igniter.js.org/og/docs-igniter-init.png', // Assuming an OG image exists
        width: 1200,
        height: 630,
        alt: 'Igniter.js Project Scaffolding with `igniter init`',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CLI: Scaffolding with `igniter init` | Igniter.js',
    description:
      'Get your project started in minutes. This guide covers how `igniter init` scaffolds your application with a feature-based architecture, interactive setup, and optional Docker integration.',
    images: ['https://igniter.js.org/og/docs-igniter-init.png'],
  },
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
