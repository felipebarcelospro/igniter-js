import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'TanStack Start Starter Guide | Igniter.js',
  description:
    'A comprehensive guide to building a modern, full-stack application with Igniter.js and the TanStack Start framework, powered by Vite.',
  keywords: [
    'Igniter.js',
    'TanStack Start',
    'TanStack Router',
    'TanStack Query',
    'Vite',
    'full-stack starter',
    'type-safe API',
    'tutorial',
    'React',
    'modern stack',
  ],
  openGraph: {
    title: 'Full-Stack Guide: Building with the Igniter.js TanStack Start Starter',
    description:
      'Learn to build modern, full-stack applications with Igniter.js and the Vite-powered TanStack Start framework for a truly modern development experience.',
    type: 'article',
    url: 'https://igniterjs.com/docs/starter-guides/tanstack-start-starter-guide',
    images: [
      {
        url: 'https://igniterjs.com/og/docs-tanstack-starter.png', // Assuming an OG image exists
        width: 1200,
        height: 630,
        alt: 'Building a Full-Stack App with TanStack Start and Igniter.js',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Full-Stack Guide: Building with the Igniter.js TanStack Start Starter',
    description:
      'Learn to build modern, full-stack applications with Igniter.js and the Vite-powered TanStack Start framework for a truly modern development experience.',
    images: ['https://igniterjs.com/og/docs-tanstack-starter.png'],
  },
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
