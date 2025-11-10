"use client";

import { CodeBlock } from 'fumadocs-ui/components/codeblock';
import { motion } from "framer-motion";
import React from "react";
import { TypeScriptIcon } from '@/components/icons/typescript';
import { CodeBlockClient } from '@/components/ui/code-block-client';
import { codeExamples, comingSoonFeatures } from '../(data)/backend-examples';
import { cn } from '@/lib/utils';

export function BackendSection() {
  const [activeExample, setActiveExample] = React.useState("controller");
  const currentExample = codeExamples.find(ex => ex.id === activeExample);

  return (
    <section className="container max-w-5xl">
      <div className="flex flex-col lg:grid lg:grid-cols-[31%_1fr] items-start gap-6 lg:gap-x-6 border p-4 sm:p-6">
        {/* Tabs Navigation */}
        <div className="w-full lg:w-auto">
          <div className="flex flex-row lg:flex-col justify-start gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 scrollbar-hide -mx-4 sm:-mx-6 px-4 sm:px-6 lg:mx-0 lg:px-0 snap-x snap-mandatory lg:snap-none">
            {codeExamples.map((example) => {
              const Icon = example.icon;
              return (
                <button
                  key={example.id}
                  onClick={() => setActiveExample(example.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all border border-transparent whitespace-nowrap flex-shrink-0 snap-start",
                    activeExample === example.id
                      ? "text-foreground border-border bg-accent/50"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
                  )}
                >
                  <Icon className="size-4 flex-shrink-0" />
                  <span>{example.title}</span>
                </button>
              );
            })}
            {/* Spacer for better scroll on mobile */}
            <div className="flex-shrink-0 w-4 lg:hidden" aria-hidden="true" />
          </div>
        </div>

        {/* Code Block */}
        {currentExample && (
          <motion.div
            key={`code-${currentExample.id}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="w-full min-w-0"
          >
            <CodeBlockClient lang="ts" className='bg-secondary my-0' code={currentExample.code} icon={<TypeScriptIcon className='size-4' />} title={currentExample.filePath} />
          </motion.div>
        )}
      </div>
    </section>
  );
}
