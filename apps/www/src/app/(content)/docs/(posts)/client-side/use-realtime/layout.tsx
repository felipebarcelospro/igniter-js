import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Real-time Subscriptions with `useRealtime` | Igniter.js',
  description:
    'Learn how to use the `useRealtime` hook to subscribe to live data streams from your Igniter.js backend, perfect for notifications, chats, and live activity feeds.',
  keywords: [
    'Igniter.js',
    'useRealtime',
    'real-time',
    'live data',
    'subscriptions',
    'Server-Sent Events',
    'SSE',
    'React hooks',
    'client-side',
    'full-stack',
  ],
  openGraph: {
    title: 'Real-time Subscriptions with `useRealtime` | Igniter.js',
    description:
      'Master real-time data streaming with the `useRealtime` hook. This guide covers subscribing to server-pushed events and managing the connection lifecycle.',
    type: 'article',
    url: 'https://igniter.js.org/docs/client-side/use-realtime',
    images: [
      {
        url: 'https://igniter.js.org/og/docs-use-realtime.png', // Assuming an OG image exists
        width: 1200,
        height: 630,
        alt: 'Using the `useRealtime` hook in Igniter.js',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Real-time Subscriptions with `useRealtime` | Igniter.js',
    description:
      'Master real-time data streaming with the `useRealtime` hook. This guide covers subscribing to server-pushed events and managing the connection lifecycle.',
    images: ['https://igniter.js.org/og/docs-use-realtime.png'],
  },
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
