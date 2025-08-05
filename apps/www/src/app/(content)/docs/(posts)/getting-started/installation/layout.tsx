import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Installation | Igniter.js',
  description:
    'Learn how to install Igniter.js, either by scaffolding a new project with `igniter init` or by adding it manually to an existing codebase. Includes optional peer dependencies.',
  keywords: [
    'Igniter.js',
    'installation',
    'setup',
    'igniter init',
    'npm install',
    'yarn add',
    'ioredis',
    'bullmq',
    'zod',
    'peer dependencies',
  ],
  openGraph: {
    title: 'Installation | Igniter.js',
    description:
      'Step-by-step guide to installing Igniter.js. Covers both automated scaffolding for new projects and manual setup for existing ones, plus optional dependencies.',
    type: 'article',
    url: 'https://igniter.js.org/docs/getting-started/installation',
    images: [
      {
        url: 'https://igniter.js.org/og/docs-installation.png', // Assuming an OG image exists
        width: 1200,
        height: 630,
        alt: 'Installing Igniter.js',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Installation | Igniter.js',
    description:
      'Step-by-step guide to installing Igniter.js. Covers both automated scaffolding for new projects and manual setup for existing ones, plus optional dependencies.',
    images: ['https://igniter.js.org/og/docs-installation.png'],
  },
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
