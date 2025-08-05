import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Igniter.js Queues: Reliable Background Processing',
  description:
    'Learn how to use Igniter.js Queues for reliable background job processing. Offload long-running tasks like sending emails or processing images to keep your API fast and responsive.',
  keywords: [
    'Igniter.js',
    'background jobs',
    'job queue',
    'BullMQ',
    'Redis',
    'worker process',
    'task offloading',
    'TypeScript',
    'backend development',
  ],
  openGraph: {
    title: 'Igniter.js Queues: Reliable Background Processing',
    description:
      'Master background job processing in Igniter.js. Our guide shows you how to use the BullMQ driver to manage long-running tasks and improve API performance.',
    type: 'article',
    url: 'https://igniter.js.org/docs/advanced-features/queues',
    images: [
      {
        url: 'https://igniter.js.org/og/docs-queues.png', // Assuming an OG image exists
        width: 1200,
        height: 630,
        alt: 'Igniter.js Queues for Background Processing',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Igniter.js Queues: Reliable Background Processing',
    description:
      'Master background job processing in Igniter.js. Our guide shows you how to use the BullMQ driver to manage long-running tasks and improve API performance.',
    images: ['https://igniter.js.org/og/docs-queues.png'],
  },
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
