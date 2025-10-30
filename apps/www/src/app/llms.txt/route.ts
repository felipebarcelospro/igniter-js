import { generateLLMSTxt } from '@/lib/llms';

export const revalidate = false;

/**
 * Main llms.txt route
 */
export async function GET() {
  const content = await generateLLMSTxt();
  
  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}

