"use client";

import { CodeBlock } from 'fumadocs-ui/components/codeblock';
import { motion } from "framer-motion";
import React from "react";
import { TypeScriptIcon } from '@/components/icons/typescript';
import { CodeBlockClient } from '@/components/ui/code-block-client';
import { codeExamples, comingSoonFeatures } from '../(data)/backend-examples';

interface BackendSectionMobileProps {
  activeExample: string;
  onExampleChange: (id: string) => void;
}

export function BackendSectionMobile({ 
  activeExample, 
  onExampleChange 
}: BackendSectionMobileProps) {
  const currentExample = codeExamples.find(ex => ex.id === activeExample);

  return (
    <div className="lg:hidden">
      {/* Mobile Header */}
      <div className="p-4 sm:p-6">
        <div className="mb-8">
          <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-2">
            <span className="text-2xl sm:text-3xl text-[#FF4931] pr-2">/</span>
            Backend
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Code that speaks for itself. Simple, elegant, and expressive syntax that feels like first-class citizen.
          </p>
        </div>

        {/* Mobile Navigation */}
        <div className="grid gap-2 mb-2">
          {codeExamples.map((example) => (
            <button
              key={example.id}
              onClick={() => onExampleChange(example.id)}
              className={`p-3 text-left rounded-lg border transition-all ${
                activeExample === example.id
                  ? "bg-accent border-accent-foreground/20 opacity-100"
                  : "border-border opacity-60 hover:opacity-80 hover:bg-accent/50"
              }`}
            >
              <h3 className="text-sm font-semibold text-foreground">
                {example.title}
              </h3>
            </button>
          ))}
        </div>

        {/* Mobile Coming Soon */}
        <div className="grid grid-cols-1 gap-2 mb-6">
          {comingSoonFeatures.map((feature) => (
            <div
              className="p-3 text-left rounded-lg border border-border opacity-30"
              key={feature.title}
            >
              <h3 className="text-sm font-semibold text-foreground">
                {feature.title} (soon)
              </h3>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Code Display */}
      <div className="border-t border-border p-4 sm:p-6">
        {currentExample && (
          <motion.div
            key={currentExample.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-4">
              <h3 className="font-semibold text-foreground mb-1">
                {currentExample.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {currentExample.description}
              </p>
            </div>
            <div className="relative">
              <CodeBlock 
                className='size-4' 
                icon={<TypeScriptIcon />} 
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
