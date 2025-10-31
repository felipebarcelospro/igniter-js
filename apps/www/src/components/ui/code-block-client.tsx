"use client";

import { useEffect, useState } from 'react';
import { codeToHast } from 'shiki';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import { Fragment } from 'react';
import { jsx, jsxs } from 'react/jsx-runtime';
import * as Base from 'fumadocs-ui/components/codeblock';
import { cn } from '@/lib/utils';
import type { BundledLanguage, LanguageInput, SpecialLanguage } from 'shiki';

type CodeBlockClientProps = {
  code: string;
  lang: string;
  title?: string;
  icon?: React.ReactNode;
  wrapper?: Base.CodeBlockProps;
  className?: string;
};

export const CodeBlockClient = ({ code, lang, wrapper, ...rest }: CodeBlockClientProps) => {
  const [rendered, setRendered] = useState<React.ReactNode>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const highlightCode = async () => {
      try {
        const { getHighlighter } = await import('fumadocs-core/highlight');
        
        const highlighter = await getHighlighter('js', {
          langs: ['js', 'ts', 'jsx', 'tsx'],
          themes: ['vesper', 'github-light'],
        });

        await highlighter.loadLanguage(lang as any);
        
        const hast = highlighter.codeToHast(code, {
          lang,
          defaultColor: false,
          themes: {
            light: 'github-light',
            dark: 'vesper',
          },
        });

        const rendered = toJsxRuntime(hast, {
          Fragment,
          jsx,
          jsxs,
          components: {
            pre: Base.Pre,
          },
        });

        setRendered(rendered);
      } catch (error) {
        console.error('Error highlighting code:', error);
      } finally {
        setIsLoading(false);
      }
    };

    highlightCode();
  }, [code, lang]);

  if (isLoading) {
    return (
      <Base.CodeBlock {...wrapper} className={cn('my-0', wrapper?.className)}>
        <div className="h-64 bg-muted/30 animate-pulse rounded" />
      </Base.CodeBlock>
    );
  }

  return (
    <Base.CodeBlock {...wrapper} className={cn('my-0 bg-transparent', wrapper?.className)} {...rest}>
      {rendered}
    </Base.CodeBlock>
  );
};
