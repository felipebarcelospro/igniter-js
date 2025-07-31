import React, { ReactNode } from 'react';

interface FrameProps {
  children: ReactNode;
  title?: string;
  src?: string;
  height?: string | number;
  width?: string | number;
}

export const Frame: React.FC<FrameProps> = ({ children, title, src, height = '400px', width = '100%' }) => {
  if (src) {
    return (
      <div className="my-6 border border-border rounded-lg overflow-hidden">
        {title && (
          <div className="bg-muted/30 px-4 py-2 border-b border-border font-medium text-sm">
            {title}
          </div>
        )}
        <iframe
          src={src}
          style={{ height, width }}
          className="border-0"
          title={title || 'Frame content'}
        />
      </div>
    );
  }

  return (
    <div className="my-6 border border-border rounded-lg overflow-hidden">
      {title && (
        <div className="bg-muted/30 px-4 py-2 border-b border-border font-medium text-sm">
          {title}
        </div>
      )}
      <div className="p-4" style={{ height, width }}>
        {children}
      </div>
    </div>
  );
};