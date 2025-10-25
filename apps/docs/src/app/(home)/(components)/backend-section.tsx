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
    <section className="container max-w-6xl">
      <div className="flex flex-col items-center border py-8">
        {/* Tabs Navigation */}
        <div className="w-full max-w-4xl mb-8">
          <div className="flex flex-wrap justify-center gap-2">
            {codeExamples.map((example) => {
              const Icon = example.icon;
              return (
                <button
                  key={example.id}
                  onClick={() => setActiveExample(example.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all border border-transparent",
                    activeExample === example.id
                      ? "text-foreground border-border"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="size-4" />
                  <span className="hidden sm:inline">{example.title}</span>
                  <span className="sm:hidden">{example.title.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Title and Description */}
        {currentExample && (
          <motion.div
            key={currentExample.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-center mb-8"
          >
            <h2 className="text-xl font-mono text-foreground mb-1">
              {currentExample.title}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
              {currentExample.description}
            </p>
          </motion.div>
        )}

        {/* Code Block */}
        {currentExample && (
          <motion.div
            key={`code-${currentExample.id}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="w-full max-w-[800px]"
          >
            <CodeBlock 
              className='[&>div]:py-0 bg-accent/10' 
              icon={<TypeScriptIcon className='size-4' />} 
              lang='ts' 
              title={currentExample.filePath}
            >
              <CodeBlockClient lang="ts" code={currentExample.code} />
            </CodeBlock>
          </motion.div>
        )}
      </div>
    </section>
  );
}
