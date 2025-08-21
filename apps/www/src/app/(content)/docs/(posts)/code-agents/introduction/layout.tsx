import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Introduction to Code Agents | Igniter.js',
  description:
    'Learn how to leverage AI Code Agents and Large Language Models (LLMs) with Igniter.js. Discover our AI-Friendly architecture and integrations with tools like Cursor, Windsurf, and Claude.',
  keywords: [
    'Igniter.js',
    'Code Agents',
    'AI-Friendly',
    'LLM',
    'Large Language Models',
    'Cursor',
    'Windsurf',
    'Claude',
    'Zed Editor',
    'AI development',
  ],
  openGraph: {
    title: 'Introduction to Code Agents | Igniter.js',
    description:
      'Explore how the AI-Friendly design of Igniter.js enhances your development workflow when paired with modern Code Agents and LLMs.',
    type: 'article',
    url: 'https://igniterjs.com/docs/code-agents/introduction',
    images: [
      {
        url: 'https://igniterjs.com/og/docs-code-agents-intro.png', // Assuming an OG image exists
        width: 1200,
        height: 630,
        alt: 'Igniter.js and AI Code Agents',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Introduction to Code Agents | Igniter.js',
    description:
      'Explore how the AI-Friendly design of Igniter.js enhances your development workflow when paired with modern Code Agents and LLMs.',
    images: ['https://igniterjs.com/og/docs-code-agents-intro.png'],
  },
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
