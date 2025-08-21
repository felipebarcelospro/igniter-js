import { Metadata } from 'next';
import { ReactNode } from "react"

export const metadata: Metadata = {
  title: 'Igniter Studio (API Playground) | Igniter.js',
  description:
    'Explore and test your APIs interactively with Igniter Studio, powered by Scalar API Reference. Learn how to enable the playground in development and production with proper security controls.',
  keywords: [
    'Igniter.js',
    'Igniter Studio',
    'API playground',
    'Scalar API Reference',
    'interactive API testing',
    'API explorer',
    'development tools',
    'API documentation',
    'REST API testing',
    'TypeScript',
  ],
  openGraph: {
    title: 'Igniter Studio (API Playground) | Igniter.js',
    description:
      'Test and explore your APIs interactively with Igniter Studio. Enable the beautiful Scalar-powered playground in development and production with secure authentication controls.',
    type: 'article',
    url: 'https://igniterjs.com/docs/advanced-features/igniter-studio',
    images: [
      {
        url: 'https://igniterjs.com/og/docs-igniter-studio.png',
        width: 1200,
        height: 630,
        alt: 'Igniter.js Studio API Playground',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Igniter Studio (API Playground) | Igniter.js',
    description:
      'Test and explore your APIs interactively with Igniter Studio. Enable the beautiful Scalar-powered playground in development and production with secure authentication controls.',
    images: ['https://igniterjs.com/og/docs-igniter-studio.png'],
  },
};

interface IgniterStudioLayoutProps {
  children: ReactNode
}

export default function IgniterStudioLayout({ children }: IgniterStudioLayoutProps) {
  return children
}