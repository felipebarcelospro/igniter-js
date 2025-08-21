import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title:
    'Build a Real-Time Chat App with Igniter.js, Next.js & Prisma',
  description:
    'A step-by-step tutorial on building a production-ready, real-time chat application using the Igniter.js framework with Next.js, Prisma, and Server-Sent Events (SSE).',
  keywords: [
    'Igniter.js',
    'real-time chat',
    'Next.js tutorial',
    'Prisma',
    'Server-Sent Events',
    'SSE',
    'full-stack tutorial',
    'TypeScript',
    'websockets alternative',
    'React',
  ],
  openGraph: {
    title: 'Build a Real-Time Chat App with Igniter.js, Next.js & Prisma',
    description:
      'Follow this comprehensive guide to build a fully functional, real-time chat application from scratch with Igniter.js.',
    type: 'article',
    url: 'https://igniterjs.com/blog/tutorials/real-time-chat-with-igniterjs',
    images: [
      {
        url: 'https://igniterjs.com/og/real-time-chat-tutorial.png', // Assuming an OG image exists at this path
        width: 1200,
        height: 630,
        alt: 'Real-Time Chat App Tutorial with Igniter.js',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Build a Real-Time Chat App with Igniter.js, Next.js & Prisma',
    description:
      'Follow this comprehensive guide to build a fully functional, real-time chat application from scratch with Igniter.js.',
    images: ['https://igniterjs.com/og/real-time-chat-tutorial.png'],
  },
};

export default function PostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
