import { ImageResponse } from 'next/og';

const size = {
  width: 1200,
  height: 630,
};

export async function GET(
  request: Request,
  ctx: RouteContext<'/blog/announcements/[slug]/og'>,
) {
  const { slug } = await ctx.params
  
  const title = slug.replace(/-/g, ' ');

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          backgroundColor: 'hsl(0 0% 3.9%)',
          color: 'hsl(0 0% 98%)',
          padding: '80px',
        }}
      >
        <img src="https://igniterjs.com/logo-light.svg" style={{ height: '64px' }} />
        <h1
          style={{
            fontSize: '60px',
            fontWeight: 'bold',
            lineHeight: '1.1',
            textWrap: 'pretty',
            textTransform: 'capitalize',
          }}
        >
          {title}
        </h1>
      </div>
    ),
    {
      ...size,
    }
  );
}