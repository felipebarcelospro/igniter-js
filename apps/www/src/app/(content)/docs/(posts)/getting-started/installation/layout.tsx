import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Installation - Getting Started with Igniter.js',
  description:
    'Learn how to install Igniter.js. Start with official templates, use the `igniter init` CLI for a custom setup, or add it manually to an existing project.',
  keywords: [
    'Igniter.js',
    'installation',
    'setup',
    'igniter init',
    'templates',
    'starters',
    'npm install',
    'yarn add',
    'pnpm add',
    'bun add',
    'ioredis',
    'bullmq',
    'zod',
    'peer dependencies',
    'quick start',
  ],
  openGraph: {
    title: 'Installation - Getting Started with Igniter.js',
    description:
      'Step-by-step guide to installing Igniter.js. Covers official templates, automated scaffolding with `igniter init`, and manual setup for existing projects.',
    type: 'article',
    url: 'https://igniter.js.org/docs/getting-started/installation',
    images: [
      {
        url: 'https://igniter.js.org/og/docs-installation.png',
        width: 1200,
        height: 630,
        alt: 'Installing Igniter.js using templates or CLI',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Installation - Getting Started with Igniter.js',
    description:
      'Step-by-step guide to installing Igniter.js. Covers official templates, automated scaffolding with `igniter init`, and manual setup for existing projects.',
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
