import { ImageResponse } from 'next/og';
import { generate as DefaultImage } from 'fumadocs-ui/og';
import { config } from '@/configs/application';

export const runtime = 'edge';
export const revalidate = false;

/**
 * Generate OG image for homepage
 */
export async function GET() {
  return new ImageResponse(
    (
      <DefaultImage
        title={config.projectName}
        description={config.projectTagline}
        site={config.projectName}
      />
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}

