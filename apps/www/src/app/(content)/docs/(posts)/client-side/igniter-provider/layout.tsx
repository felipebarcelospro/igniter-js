import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: '<IgniterProvider>: The Root of the Client-Side | Igniter.js',
  description:
    'Learn how to set up the <IgniterProvider>, the core component for managing client-side cache, real-time SSE connections, and providing context for React hooks.',
  keywords: [
    'Igniter.js',
    'IgniterProvider',
    'client-side',
    'React context',
    'query cache',
    'realtime',
    'SSE',
    'useQuery',
    'useMutation',
    'full-stack',
  ],
  openGraph: {
    title: '<IgniterProvider>: The Root of the Client-Side | Igniter.js',
    description:
      'Master the setup and configuration of the <IgniterProvider>, the essential wrapper for all client-side features in your Igniter.js application.',
    type: 'article',
    url: 'https://igniterjs.com/docs/client-side/igniter-provider',
    images: [
      {
        url: 'https://igniterjs.com/og/docs-igniter-provider.png', // Assuming an OG image exists
        width: 1200,
        height: 630,
        alt: 'Igniter.js Provider Setup',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '<IgniterProvider>: The Root of the Client-Side | Igniter.js',
    description:
      'Master the setup and configuration of the <IgniterProvider>, the essential wrapper for all client-side features in your Igniter.js application.',
    images: ['https://igniterjs.com/og/docs-igniter-provider.png'],
  },
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
