import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'CLI & Tooling | Igniter.js',
  description:
    'Master the Igniter.js CLI to streamline your development workflow. Learn about project scaffolding with `igniter init`, running the dev server with `igniter dev`, and code generation.',
  keywords: [
    'Igniter.js',
    'CLI',
    'command line interface',
    'tooling',
    'scaffolding',
    'code generation',
    'igniter init',
    'igniter dev',
    'igniter generate',
    'developer tools',
  ],
  openGraph: {
    title: 'CLI & Tooling | Igniter.js',
    description:
      'Explore the powerful command-line tools that come with Igniter.js to boost your productivity from project creation to deployment.',
    type: 'article',
    url: 'https://igniter.js.org/docs/cli-and-tooling',
    images: [
      {
        url: 'https://igniter.js.org/og/docs-cli-and-tooling.png', // Assuming an OG image exists
        width: 1200,
        height: 630,
        alt: 'Igniter.js CLI and Tooling',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CLI & Tooling | Igniter.js',
    description:
      'Explore the powerful command-line tools that come with Igniter.js to boost your productivity from project creation to deployment.',
    images: ['https://igniter.js.org/og/docs-cli-and-tooling.png'],
  },
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
