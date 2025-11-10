import { generateAllLLMSFullTxt } from '@/lib/llms';

export const revalidate = false;

/**
 * Full content route for all content types
 */
export async function GET() {
  const content = await generateAllLLMSFullTxt();
  
  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
