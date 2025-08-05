import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Igniter.js Docs: The AI-Friendly, Typesafe Framework',
  description:
    'Welcome to the official documentation for Igniter.js. Learn how to build modern, type-safe TypeScript applications with our comprehensive guides and tutorials.',
  keywords: [
    'Igniter.js',
    'documentation',
    'TypeScript framework',
    'full-stack',
    'type-safe',
    'AI-Friendly',
    'Node.js',
    'React',
    'Next.js',
    'API development',
    'tutorial',
  ],
  openGraph: {
    title: 'Igniter.js Docs: The AI-Friendly, Typesafe Framework',
    description:
      'The official documentation for Igniter.js. Learn to build modern, type-safe applications with features like real-time updates, background jobs, and a powerful plugin system.',
    type: 'website',
    url: 'https://igniter.js.org/docs',
    images: [
      {
        url: 'https://igniter.js.org/og/docs-home.png', // Assuming an OG image exists
        width: 1200,
        height: 630,
        alt: 'Official Documentation for Igniter.js',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Igniter.js Docs: The AI-Friendly, Typesafe Framework',
    description:
      'The official documentation for Igniter.js. Learn to build modern, type-safe applications with features like real-time updates, background jobs, and a powerful plugin system.',
    images: ['https://igniter.js.org/og/docs-home.png'],
  },
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
