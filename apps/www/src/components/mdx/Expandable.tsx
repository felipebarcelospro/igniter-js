'use client';

import React, { useState, ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

interface ExpandableProps {
  title: string;
  children: ReactNode;
  defaultExpanded?: boolean;
}

export const Expandable: React.FC<ExpandableProps> = ({ title, children, defaultExpanded = false }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="my-4">
      <button
        className="flex items-center gap-2 text-left font-medium hover:text-primary transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        {title}
      </button>
      {isExpanded && (
        <div className="mt-2 ml-6 pl-4 border-l-2 border-border">
          {children}
        </div>
      )}
    </div>
  );
};