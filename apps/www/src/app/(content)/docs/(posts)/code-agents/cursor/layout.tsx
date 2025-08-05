import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Using Cursor as a Code Agent | Igniter.js',
  description:
    'Learn how to configure the Cursor code editor to work as an expert on your Igniter.js project by setting up rules and using our AI-friendly templates.',
  keywords: [
    'Igniter.js',
    'Cursor',
    'AI code editor',
    'Code Agent',
    'AI development',
    '.cursor/rules',
    'AI-Friendly',
    'pair-programming',
    'LLM',
  ],
  openGraph: {
    title: 'Using Cursor as a Code Agent with Igniter.js',
    description:
      'A guide to making Cursor an expert on your Igniter.js project using custom rules and official templates for a seamless AI-assisted development experience.',
    type: 'article',
    url: 'https://igniter.js.org/docs/code-agents/cursor',
    images: [
      {
        url: 'https://igniter.js.org/og/docs-cursor.png', // Assuming an OG image exists
        width: 1200,
        height: 630,
        alt: 'Using Cursor with Igniter.js',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Using Cursor as a Code Agent with Igniter.js',
    description:
      'A guide to making Cursor an expert on your Igniter.js project using custom rules and official templates for a seamless AI-assisted development experience.',
    images: ['https://igniter.js.org/og/docs-cursor.png'],
  },
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
