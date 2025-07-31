'use client';

import React, { useState, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface AccordionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export const Accordion: React.FC<AccordionProps> = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-border rounded-lg my-4 overflow-hidden">
      <button
        className="w-full px-4 py-3 text-left bg-muted/30 hover:bg-muted/50 transition-colors flex items-center justify-between font-medium"
        onClick={() => setIsOpen(!isOpen)}
      >
        {title}
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="px-4 py-3 border-t border-border">
          {children}
        </div>
      )}
    </div>
  );
};