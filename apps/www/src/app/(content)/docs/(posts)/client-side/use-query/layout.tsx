import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Data Fetching with `useQuery` | Igniter.js',
  description:
    'Learn to fetch data from your backend with the type-safe `useQuery` hook. This guide covers basic usage, passing parameters, and advanced configuration options like caching and refetching.',
  keywords: [
    'Igniter.js',
    'useQuery',
    'data fetching',
    'React hooks',
    'client-side',
    'caching',
    'staleTime',
    'refetching',
    'type-safe',
    'full-stack',
  ],
  openGraph: {
    title: 'Data Fetching with `useQuery` | Igniter.js',
    description:
      'Master data fetching in Igniter.js with the `useQuery` hook. Explore its powerful, type-safe API for handling loading states, errors, caching, and more.',
    type: 'article',
    url: 'https://igniterjs.com/docs/client-side/use-query',
    images: [
      {
        url: 'https://igniterjs.com/og/docs-use-query.png', // Assuming an OG image exists
        width: 1200,
        height: 630,
        alt: 'Using the `useQuery` hook in Igniter.js',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Data Fetching with `useQuery` | Igniter.js',
    description:
      'Master data fetching in Igniter.js with the `useQuery` hook. Explore its powerful, type-safe API for handling loading states, errors, caching, and more.',
    images: ['https://igniterjs.com/og/docs-use-query.png'],
  },
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
