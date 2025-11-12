import { generateLLMSFullTxt } from '@/lib/llms';
import type { ContentType } from '@/lib/content-manager';

export const revalidate = false;

/**
 * Full content route for a specific content type
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  const resolvedParams = await params;
  
  // Validate that type is a valid ContentType
  const validTypes: ContentType[] = ['blog', 'docs', 'changelog', 'learn', 'showcase', 'templates'];
  
  if (!validTypes.includes(resolvedParams.type as ContentType)) {
    return new Response('Content type not found', { status: 404 });
  }
  
  try {
    const content = await generateLLMSFullTxt(resolvedParams.type as ContentType);
    
    return new Response(content, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    return new Response('Content type not found', { status: 404 });
  }
}

