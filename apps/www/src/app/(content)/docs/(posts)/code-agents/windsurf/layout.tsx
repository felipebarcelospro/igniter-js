import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Using Windsurf as a Code Agent | Igniter.js',
  description:
    'Learn how to configure the Windsurf AI code editor to be an expert on your Igniter.js project by setting up workspace rules and using our AI-friendly templates.',
  keywords: [
    'Igniter.js',
    'Windsurf',
    'Codeium',
    'AI code editor',
    'Code Agent',
    'AI development',
    '.windsurf/rules',
    'AI-Friendly',
    'LLM',
  ],
  openGraph: {
    title: 'Using Windsurf as a Code Agent with Igniter.js',
    description:
      'A guide to making the Windsurf AI editor an expert on your Igniter.js project using custom rules and official templates for a seamless development experience.',
    type: 'article',
    url: 'https://igniter.js.org/docs/code-agents/windsurf',
    images: [
      {
        url: 'https://igniter.js.org/og/docs-windsurf.png', // Assuming an OG image exists
        width: 1200,
        height: 630,
        alt: 'Using Windsurf with Igniter.js',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Using Windsurf as a Code Agent with Igniter.js',
    description:
      'A guide to making the Windsurf AI editor an expert on your Igniter.js project using custom rules and official templates for a seamless development experience.',
    images: ['https://igniter.js.org/og/docs-windsurf.png'],
  },
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
