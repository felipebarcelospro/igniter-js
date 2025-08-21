import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Introducing Igniter.js: A Type-Safe Full-Stack Framework',
  description:
    'Learn about Igniter.js, the modern, type-safe full-stack framework designed to solve common development complexities, enhance developer experience, and provide robust features like real-time updates and background jobs by default.',
  keywords: [
    'Igniter.js',
    'TypeScript framework',
    'full-stack',
    'type-safe',
    'Node.js',
    'React',
    'Next.js',
    'web development',
    'developer experience',
    'tRPC alternative',
  ],
  openGraph: {
    title: 'Introducing Igniter.js: A Type-Safe Full-Stack Framework',
    description:
      'Discover Igniter.js, a modern framework that brings end-to-end type safety to your full-stack applications, simplifying state management and backend complexity.',
    type: 'article',
    url: 'https://igniterjs.com/blog/tutorials/introducing-igniter-js',
    images: [
      {
        url: 'https://igniterjs.com/og/introducing-igniter-js.png', // Assuming an OG image exists at this path
        width: 1200,
        height: 630,
        alt: 'Introducing Igniter.js',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Introducing Igniter.js: A Type-Safe Full-Stack Framework',
    description:
      'Discover Igniter.js, a modern framework that brings end-to-end type safety to your full-stack applications, simplifying state management and backend complexity.',
    images: ['https://igniterjs.com/og/introducing-igniter-js.png'],
  },
};

export default function PostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
