'use client';

import React, { useState, ReactNode } from 'react';
import { Copy, Check } from 'lucide-react';

interface SnippetProps {
  children: ReactNode;
  text?: string;
}

export const Snippet: React.FC<SnippetProps> = ({ children, text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const textToCopy = text || (typeof children === 'string' ? children : '');
    if (textToCopy) {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="inline-flex items-center gap-2 bg-muted px-3 py-1 rounded-md font-mono text-sm">
      <span>{children}</span>
      <button
        onClick={handleCopy}
        className="text-muted-foreground hover:text-foreground transition-colors"
        title="Copy to clipboard"
      >
        {copied ? (
          <Check className="h-3 w-3 text-green-600" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </button>
    </div>
  );
};