"use client";

import { CodeBlock } from 'fumadocs-ui/components/codeblock';
import { motion } from "framer-motion";
import React from "react";
import { TypeScriptIcon } from '@/components/icons/typescript';
import { CodeBlockClient } from '@/components/ui/code-block-client';
import { codeExamples, comingSoonFeatures } from '../(data)/backend-examples';

interface BackendSectionDesktopProps {
  activeExample: string;
  onExampleChange: (id: string) => void;
}

export function BackendSectionDesktop({ 
  activeExample, 
  onExampleChange 
}: BackendSectionDesktopProps) {
  const currentExample = codeExamples.find(ex => ex.id === activeExample);

  return (
    <div className="hidden lg:grid lg:grid-cols-2">
      {/* Desktop Sidebar */}
      <div className="p-10">
        <div className="mb-16">
          <h2 className="text-2xl font-semibold text-foreground mb-2">
            <span className="text-3xl text-[#FF4931] pr-2">/</span>
            Backend
          </h2>
          <p className="text-muted-foreground max-w-md">
            Code that speaks for itself. Simple, elegant, and expressive syntax that feels like first-class citizen.
          </p>
        </div>

        <div className="space-y-2">
          {codeExamples.map((example) => (
            <button
              key={example.id}
              onClick={() => onExampleChange(example.id)}
              className={`w-full text-left py-2 transition-opacity ${
                activeExample === example.id
                  ? "opacity-100"
                  : "opacity-50 hover:opacity-75"
              }`}
            >
              <h3 className="font-semibold text-foreground">
                {example.title}
              </h3>
            </button>
          ))}
        </div>

        {/* Desktop Coming Soon Features */}
        <div className="mt-2">
          <div className="space-y-2">
            {comingSoonFeatures.map((feature) => (
              <button
                className="w-full text-left py-2 transition-opacity opacity-30 cursor-default"
                key={feature.title}
              >
                <h3 className="font-semibold text-foreground">
                  {feature.title} (soon)
                </h3>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop Code Display */}
      <div className="border-l border-border p-10">
        {currentExample && (
          <motion.div
            key={currentExample.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-6">
              <h3 className="font-semibold text-foreground mb-1">
                {currentExample.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {currentExample.description}
              </p>
            </div>
            <div className="relative">
              <CodeBlock 
                className='[&>div]:py-0' 
                icon={<TypeScriptIcon className='size-4' />} 
                lang='ts' 
                title={currentExample.filePath}
              >
                <CodeBlockClient lang="ts" code={currentExample.code} />
              </CodeBlock>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
