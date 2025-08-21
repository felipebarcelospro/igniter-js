import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'CLI: The `igniter dev` Interactive Server | Igniter.js',
  description:
    'Learn to use the `igniter dev` command, the interactive development server for Igniter.js projects. Monitor multiple processes and view real-time API request logs in a single dashboard.',
  keywords: [
    'Igniter.js',
    'igniter dev',
    'CLI',
    'development server',
    'interactive mode',
    'API monitoring',
    'hot reloading',
    'developer experience',
    'tooling',
  ],
  openGraph: {
    title: 'CLI: The `igniter dev` Interactive Server | Igniter.js',
    description:
      'Master the `igniter dev` command and its interactive dashboard to streamline your full-stack development workflow, manage multiple processes, and monitor API requests in real-time.',
    type: 'article',
    url: 'https://igniterjs.com/docs/cli-and-tooling/igniter-dev',
    images: [
      {
        url: 'https://igniterjs.com/og/docs-igniter-dev.png', // Assuming an OG image exists
        width: 1200,
        height: 630,
        alt: 'Igniter.js Interactive Dev Server',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CLI: The `igniter dev` Interactive Server | Igniter.js',
    description:
      'Master the `igniter dev` command and its interactive dashboard to streamline your full-stack development workflow, manage multiple processes, and monitor API requests in real-time.',
    images: ['https://igniterjs.com/og/docs-igniter-dev.png'],
  },
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
