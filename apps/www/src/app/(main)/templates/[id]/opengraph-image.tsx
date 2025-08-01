import { ImageResponse } from 'next/og';
import { templates } from '../data/templates';

// Image metadata
export const alt = 'Igniter.js Template';
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

interface Props {
  params: Promise<{
    id: string;
  }>;
}

// Image generation
export default async function Image({ params }: Props) {
  const { id } = await params;
  const template = templates.find(t => t.id === id);
  
  if (!template) {
    // Fallback for unknown template
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0a0a0a',
            color: 'white',
            fontSize: '48px',
          }}
        >
          Template Not Found
        </div>
      ),
      { ...size }
    );
  }

  // Get framework color
  const getFrameworkColor = (framework: string) => {
    const colors: Record<string, string> = {
      'Next.js': '#000000',
      'React': '#61dafb',
      'Express': '#68cc68',
      'TanStack Start': '#ff6b35',
      'Bun': '#fbf0df',
      'Deno': '#000000',
    };
    return colors[framework] || '#3b82f6';
  };

  const frameworkColor = getFrameworkColor(template.framework);

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0a0a0a',
          backgroundImage: 'radial-gradient(circle at 25px 25px, #333 2%, transparent 0%), radial-gradient(circle at 75px 75px, #333 2%, transparent 0%)',
          backgroundSize: '100px 100px',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '40px 60px',
            borderBottom: '1px solid #333',
          }}
        >
          {/* Logo */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                backgroundColor: '#3b82f6',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '12px',
              }}
            >
              <div
                style={{
                  color: 'white',
                  fontSize: '20px',
                  fontWeight: 'bold',
                }}
              >
                ⚡
              </div>
            </div>
            <div
              style={{
                color: 'white',
                fontSize: '24px',
                fontWeight: 'bold',
              }}
            >
              Igniter.js
            </div>
          </div>

          {/* Framework badge */}
          <div
            style={{
              backgroundColor: frameworkColor,
              color: template.framework === 'Bun' ? '#000' : '#fff',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '16px',
              fontWeight: '600',
            }}
          >
            {template.framework}
          </div>
        </div>

        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            flex: 1,
            padding: '60px',
            textAlign: 'center',
          }}
        >
          {/* Template title */}
          <div
            style={{
              color: 'white',
              fontSize: '64px',
              fontWeight: 'bold',
              lineHeight: '1.1',
              marginBottom: '24px',
              maxWidth: '900px',
              letterSpacing: '-0.02em',
            }}
          >
            {template.title}
          </div>

          {/* Description */}
          <div
            style={{
              color: '#a1a1aa',
              fontSize: '24px',
              fontWeight: '400',
              lineHeight: '1.4',
              maxWidth: '800px',
              marginBottom: '40px',
            }}
          >
            {template.description}
          </div>

          {/* Tech stack */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
              justifyContent: 'center',
              maxWidth: '800px',
            }}
          >
            {template.tags.slice(0, 5).map((tag) => (
              <div
                key={tag}
                style={{
                  backgroundColor: '#1f2937',
                  color: '#e5e7eb',
                  padding: '6px 12px',
                  borderRadius: '16px',
                  fontSize: '14px',
                  fontWeight: '500',
                  border: '1px solid #374151',
                }}
              >
                {tag}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom accent */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '4px',
            backgroundColor: frameworkColor,
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  );
}