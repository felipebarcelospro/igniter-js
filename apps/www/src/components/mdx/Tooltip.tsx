'use client';

import React, { useState, ReactNode } from 'react';

interface TooltipProps {
  tip: string;
  children: ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ tip, children }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <span className="relative inline-block">
      <span
        className="cursor-help border-b border-dotted border-muted-foreground"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </span>
      {isVisible && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-popover text-popover-foreground text-sm rounded-md shadow-md border border-border z-10 whitespace-nowrap">
          {tip}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-popover"></div>
        </div>
      )}
    </span>
  );
};