import { ImageResponse } from 'next/og';
import { generate as DefaultImage } from 'fumadocs-ui/og';
import { config } from '@/configs/application';
import { notFound } from 'next/navigation';

export const runtime = 'edge';
export const revalidate = false;

interface RouteContext {
  params: Promise<{
    slug: string;
  }>;
}

/**
 * Generate OG image for individual blog posts
 */
export async function GET(_req: Request, { params }: RouteContext) {
  const { slug } = await params;
  
  // In a real implementation, you'd fetch the post data here
  // For now, we'll use a generic template
  return new ImageResponse(
    (
      <DefaultImage
        title={slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        description={`Read this article on ${config.projectName}`}
        site={config.projectName}
      />
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}

