import { NextRequest, NextResponse } from 'next/server';

/**
 * Route handler for generating website screenshots using API Flash
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json(
      { error: 'URL parameter is required' },
      { status: 400 }
    );
  }

  try {
    // Validate URL format
    let targetUrl: URL;
    try {
      targetUrl = new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // API Flash screenshot endpoint
    const apiFlashUrl = `https://api.apiflash.com/v1/urltoimage?access_key=f83e81428e214b5093a0bbc7ce7977e8&wait_until=page_loaded&url=${encodeURIComponent(targetUrl.toString())}&width=1920&height=2160&full_page=true&format=png&delay=0`;

    const response = await fetch(apiFlashUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Flash error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to generate screenshot', details: errorText },
        { status: response.status }
      );
    }

    // Get the image buffer
    const imageBuffer = await response.arrayBuffer();

    // Return the image with appropriate headers
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400', // Cache for 24 hours
      },
    });
  } catch (error) {
    console.error('Error generating screenshot:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

