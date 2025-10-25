"use client";

import { useEffect, useState } from 'react';
import { codeToHtml } from 'shiki';
import { cn } from '@/lib/utils';

type CodeBlockClientProps = {
  code: string;
  lang: string;
  codeblock?: {
    className?: string;
  };
};

export const CodeBlockClient = ({ code, lang, codeblock }: CodeBlockClientProps) => {
  const [html, setHtml] = useState<string>('');

  useEffect(() => {
    const highlightCode = async () => {
      const highlighted = await codeToHtml(code, {
        lang,
        themes: {
          light: 'github-light-default',
          dark: 'github-dark-default',
        },
        defaultColor: false,
      });
      setHtml(highlighted);
    };

    highlightCode();
  }, [code, lang]);

  if (!html) {
    return (
      <div
        className={cn(
          'overflow-auto text-sm border-none! bg-muted/30 animate-pulse',
          codeblock?.className
        )}
      >
        <div className="h-64" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'overflow-auto text-sm py-6 border [&_pre]:bg-transparent!',
        codeblock?.className
      )}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: Shiki generates safe HTML
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
