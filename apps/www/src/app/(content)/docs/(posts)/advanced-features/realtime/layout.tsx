import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Igniter.js Realtime: Live Data, Effortlessly',
  description:
    'Learn how to build real-time features with Igniter.js using Server-Sent Events (SSE). Automatically revalidate UI, create custom data streams, and push live data from server to client with ease.',
  keywords: [
    'Igniter.js',
    'realtime',
    'Server-Sent Events',
    'SSE',
    'live data',
    'UI revalidation',
    'data streams',
    'WebSockets alternative',
    'full-stack',
    'TypeScript',
  ],
  openGraph: {
    title: 'Igniter.js Realtime: Live Data, Effortlessly',
    description:
      'Discover how to push live data from your server to clients using Igniter.js. Implement automatic UI updates and custom data streams with our integrated SSE solution.',
    type: 'article',
    url: 'https://igniterjs.com/docs/advanced-features/realtime',
    images: [
      {
        url: 'https://igniterjs.com/og/docs-realtime.png', // Assuming an OG image exists
        width: 1200,
        height: 630,
        alt: 'Igniter.js Realtime Features',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Igniter.js Realtime: Live Data, Effortlessly',
    description:
      'Discover how to push live data from your server to clients using Igniter.js. Implement automatic UI updates and custom data streams with our integrated SSE solution.',
    images: ['https://igniterjs.com/og/docs-realtime.png'],
  },
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
