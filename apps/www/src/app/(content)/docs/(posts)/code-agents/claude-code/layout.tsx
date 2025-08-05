import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Using Claude as a Code Agent | Igniter.js',
  description:
    'Learn how to use Anthropic\'s Claude as a powerful code agent for your Igniter.js projects. Guide on training Claude with framework context and using official templates.',
  keywords: [
    'Igniter.js',
    'Claude',
    'Anthropic',
    'claude-code',
    'Code Agent',
    'AI development',
    'LLM',
    'AGENT.md',
    'llms.txt',
    'AI-Friendly',
  ],
  openGraph: {
    title: 'Using Claude as a Code Agent with Igniter.js',
    description:
      'A step-by-step guide to integrating Claude as an expert code agent for Igniter.js development, enhancing your workflow with AI-powered assistance.',
    type: 'article',
    url: 'https://igniter.js.org/docs/code-agents/claude-code',
    images: [
      {
        url: 'https://igniter.js.org/og/docs-claude-code.png', // Assuming an OG image exists
        width: 1200,
        height: 630,
        alt: 'Using Claude with Igniter.js',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Using Claude as a Code Agent with Igniter.js',
    description:
      'A step-by-step guide to integrating Claude as an expert code agent for Igniter.js development, enhancing your workflow with AI-powered assistance.',
    images: ['https://igniter.js.org/og/docs-claude-code.png'],
  },
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
