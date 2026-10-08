"use client";

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import React from 'react';
import { TypeScriptIcon } from '@/components/icons/typescript';
import { CodeBlockClient } from '@/components/ui/code-block-client';
import { codeExamples } from '../(data)/backend-examples';
import { cn } from '@/lib/utils';

export function BackendSection() {
  const [activeExample, setActiveExample] = React.useState(codeExamples[0].id);
  const currentExample = codeExamples.find((example) => example.id === activeExample);

  return (
    <section className="container max-w-5xl" aria-labelledby="ecosystem-heading">
      <div className="flex flex-col items-start gap-6 border p-4 sm:p-6 lg:grid lg:grid-cols-[34%_1fr] lg:gap-x-6">
        <header className="max-w-2xl lg:col-span-2">
          <p className="mb-2 text-sm font-medium text-muted-foreground">Igniter.js ecosystem</p>
          <h2 id="ecosystem-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Start with the package you need
          </h2>
          <p className="mt-2 text-muted-foreground">
            Explore the packages in priority order. Each example shows a real starting point and links to its guide.
          </p>
        </header>

        <nav className="w-full lg:w-auto" aria-label="Igniter.js packages">
          <div role="group" aria-label="Select a package example" className="flex flex-row justify-start gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-col lg:overflow-x-visible lg:px-0 lg:snap-none">
            {codeExamples.map((example, index) => {
              const Icon = example.icon;
              const isActive = activeExample === example.id;

              return (
                <button
                  key={example.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setActiveExample(example.id)}
                  className={cn(
                    'flex min-w-52 items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors snap-start lg:min-w-0',
                    isActive
                      ? 'border-border bg-accent/50 text-foreground'
                      : 'border-transparent text-muted-foreground hover:border-border hover:bg-accent/30 hover:text-foreground'
                  )}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-background text-muted-foreground">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{example.packageName}</span>
                    <span className="block truncate text-xs text-muted-foreground">{index + 1}. {example.title}</span>
                  </span>
                </button>
              );
            })}
            <div className="flex-shrink-0 w-4 lg:hidden" aria-hidden="true" />
          </div>
        </nav>

        {currentExample && (
          <motion.div
            key={`code-${currentExample.id}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="w-full min-w-0"
            id="package-panel"
            aria-live="polite"
          >
            <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {currentExample.packageName}
                </p>
                <h3 className="font-semibold text-foreground">{currentExample.title}</h3>
                <p className="mt-1 max-w-xl text-sm text-muted-foreground">{currentExample.description}</p>
              </div>
              <Link
                href={currentExample.docsHref}
                className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-foreground underline-offset-4 hover:underline"
              >
                Read the docs
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
            <CodeBlockClient
              lang={currentExample.lang ?? 'tsx'}
              className="my-0 bg-secondary"
              code={currentExample.code}
              icon={<TypeScriptIcon className="size-4" />}
              title={currentExample.filePath}
            />
          </motion.div>
        )}
      </div>
    </section>
  );
}
