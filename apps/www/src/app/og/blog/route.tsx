import { ImageResponse } from 'next/og';
import { generate as DefaultImage } from 'fumadocs-ui/og';
import { config } from '@/configs/application';

export const runtime = 'edge';
export const revalidate = false;

/**
 * Generate OG image for blog page
 */
export async function GET() {
  return new ImageResponse(
    (
      <DefaultImage
        title="Blog"
        description={`Latest news and updates from ${config.projectName}`}
        site={config.projectName}
      />
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}

