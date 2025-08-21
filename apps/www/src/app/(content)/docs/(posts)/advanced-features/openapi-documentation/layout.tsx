import { Metadata } from 'next';
import { ReactNode } from "react"

export const metadata: Metadata = {
  title: 'OpenAPI Documentation | Igniter.js',
  description:
    'Learn how to generate OpenAPI specifications and serve interactive API documentation with Igniter.js. Configure metadata, security schemes, and customize the Scalar API Reference UI.',
  keywords: [
    'Igniter.js',
    'OpenAPI',
    'API documentation',
    'Scalar API Reference',
    'CLI',
    'igniter generate docs',
    'API specs',
    'interactive documentation',
    'REST API',
    'TypeScript',
  ],
  openGraph: {
    title: 'OpenAPI Documentation | Igniter.js',
    description:
      'Generate comprehensive OpenAPI specifications and serve beautiful interactive API documentation with Igniter.js. Configure security, metadata, and customize the developer experience.',
    type: 'article',
    url: 'https://igniterjs.com/docs/advanced-features/openapi-documentation',
    images: [
      {
        url: 'https://igniterjs.com/og/docs-openapi-documentation.png',
        width: 1200,
        height: 630,
        alt: 'Igniter.js OpenAPI Documentation',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OpenAPI Documentation | Igniter.js',
    description:
      'Generate comprehensive OpenAPI specifications and serve beautiful interactive API documentation with Igniter.js. Configure security, metadata, and customize the developer experience.',
    images: ['https://igniterjs.com/og/docs-openapi-documentation.png'],
  },
};

interface OpenApiDocumentationLayoutProps {
  children: ReactNode
}

export default function OpenApiDocumentationLayout({
  children,
}: OpenApiDocumentationLayoutProps) {
  return children
}