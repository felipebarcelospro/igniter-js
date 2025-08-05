import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Next.js Starter Guide | Igniter.js',
  description:
    'A comprehensive guide to building a full-stack, type-safe application with the Igniter.js Next.js Starter. Leverage Server Components, Actions, and end-to-end type safety.',
  keywords: [
    'Igniter.js',
    'Next.js',
    'full-stack starter',
    'type-safe API',
    'Server Components',
    'Client Components',
    'Prisma',
    'tutorial',
    'BFF',
    'Backend-for-Frontend',
  ],
  openGraph: {
    title: 'Full-Stack Guide: Building with the Igniter.js Next.js Starter',
    description:
      'Learn to build modern, full-stack applications with Igniter.js and Next.js, leveraging the best of both frameworks for unparalleled type safety and developer experience.',
    type: 'article',
    url: 'https://igniter.js.org/docs/starter-guides/nextjs-starter-guide',
    images: [
      {
        url: 'https://igniter.js.org/og/docs-nextjs-starter.png', // Assuming an OG image exists
        width: 1200,
        height: 630,
        alt: 'Building a Full-Stack App with Next.js and Igniter.js',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Full-Stack Guide: Building with the Igniter.js Next.js Starter',
    description:
      'Learn to build modern, full-stack applications with Igniter.js and Next.js, leveraging the best of both frameworks for unparalleled type safety and developer experience.',
    images: ['https://igniter.js.org/og/docs-nextjs-starter.png'],
  },
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
