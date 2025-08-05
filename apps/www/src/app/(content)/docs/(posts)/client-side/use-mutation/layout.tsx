import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Data Modification with `useMutation` | Igniter.js',
  description:
    'Learn how to use the `useMutation` hook in Igniter.js to handle creating, updating, and deleting data with type safety, lifecycle callbacks, and cache invalidation.',
  keywords: [
    'Igniter.js',
    'useMutation',
    'data modification',
    'React hooks',
    'client-side',
    'cache invalidation',
    'optimistic updates',
    'form handling',
    'type-safe',
    'full-stack',
  ],
  openGraph: {
    title: 'Data Modification with `useMutation` | Igniter.js',
    description:
      'Master the `useMutation` hook to safely modify server data. This guide covers the entire mutation lifecycle, from state management to automatic cache updates.',
    type: 'article',
    url: 'https://igniter.js.org/docs/client-side/use-mutation',
    images: [
      {
        url: 'https://igniter.js.org/og/docs-use-mutation.png', // Assuming an OG image exists
        width: 1200,
        height: 630,
        alt: 'Using the `useMutation` hook in Igniter.js',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Data Modification with `useMutation` | Igniter.js',
    description:
      'Master the `useMutation` hook to safely modify server data. This guide covers the entire mutation lifecycle, from state management to automatic cache updates.',
    images: ['https://igniter.js.org/og/docs-use-mutation.png'],
  },
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
