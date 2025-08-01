import { ImageResponse } from 'next/og';

// Image metadata
export const alt = 'Igniter.js Templates - Find your perfect starting point';
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

// Image generation
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0a0a',
          backgroundImage: 'radial-gradient(circle at 25px 25px, #333 2%, transparent 0%), radial-gradient(circle at 75px 75px, #333 2%, transparent 0%)',
          backgroundSize: '100px 100px',
        }}
      >
        {/* Main content container */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px',
            textAlign: 'center',
          }}
        >
          {/* Logo/Brand */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '40px',
            }}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                backgroundColor: '#3b82f6',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '20px',
              }}
            >
              <div
                style={{
                  color: 'white',
                  fontSize: '32px',
                  fontWeight: 'bold',
                }}
              >
                ⚡
              </div>
            </div>
            <div
              style={{
                color: 'white',
                fontSize: '48px',
                fontWeight: 'bold',
                letterSpacing: '-0.02em',
              }}
            >
              Igniter.js
            </div>
          </div>

          {/* Main title */}
          <div
            style={{
              color: 'white',
              fontSize: '72px',
              fontWeight: 'bold',
              lineHeight: '1.1',
              marginBottom: '24px',
              maxWidth: '900px',
              letterSpacing: '-0.02em',
            }}
          >
            Templates
          </div>

          {/* Subtitle */}
          <div
            style={{
              color: '#a1a1aa',
              fontSize: '32px',
              fontWeight: '400',
              lineHeight: '1.4',
              maxWidth: '800px',
              marginBottom: '40px',
            }}
          >
            Find your perfect starting point
          </div>

          {/* Tech stack badges */}
          <div
            style={{
              display: 'flex',
              gap: '16px',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            {['Next.js', 'React', 'TypeScript', 'Tailwind CSS', 'Prisma'].map((tech) => (
              <div
                key={tech}
                style={{
                  backgroundColor: '#1f2937',
                  color: '#e5e7eb',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: '18px',
                  fontWeight: '500',
                  border: '1px solid #374151',
                }}
              >
                {tech}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom gradient */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '200px',
            background: 'linear-gradient(to top, #3b82f6, transparent)',
            opacity: 0.1,
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  );
}