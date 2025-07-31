import React, { ReactNode } from 'react';
import { Play } from 'lucide-react';

interface ExampleProps {
  children: ReactNode;
  title?: string;
}

export const Example: React.FC<ExampleProps> = ({ children, title }) => {
  return (
    <div className="my-6 border border-border rounded-lg overflow-hidden">
      <div className="bg-muted/30 px-4 py-2 border-b border-border flex items-center gap-2">
        <Play className="h-4 w-4 text-green-600" />
        <span className="font-medium text-sm">{title || 'Example'}</span>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
};