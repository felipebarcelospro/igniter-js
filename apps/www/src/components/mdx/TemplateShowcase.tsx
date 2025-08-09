'use client';

import React, { useState } from 'react';
import { templates, Template } from '@/app/(main)/templates/data/templates';
import { ProjectBuilder } from '@/app/(main)/templates/[id]/components/project-builder';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

// A map to get logo URLs based on framework name
const frameworkLogos: { [key: string]: string } = {
  'Next.js': 'https://svgl.app/library/nextjs_icon_dark.svg',
  'React': 'https://svgl.app/library/react.svg',
  'Bun': 'https://svgl.app/library/bun.svg',
  'TanStack Start': 'https://svgl.app/library/tanstack.svg',
  'Express': 'https://svgl.app/library/expressjs.svg',
  'Deno': 'https://svgl.app/library/deno.svg',
};

export const TemplateShowcase: React.FC = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);

  const handleStartProject = (template: Template) => {
    setSelectedTemplate(template);
    setIsBuilderOpen(true);
  };

  const handleCloseBuilder = () => {
    setIsBuilderOpen(false);
    setSelectedTemplate(null);
  };

  // We only want to showcase the main starters, not all samples/boilerplates
  const featuredTemplates = templates.filter(t => t.id.startsWith('starter-'));

  return (
    <div className="my-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {featuredTemplates.map((template) => {
          const logoUrl = frameworkLogos[template.framework] || 'https://svgl.app/library/igniterjs.svg';

          return (
            <div
              key={template.id}
              className="flex flex-col items-start gap-4 p-6 bg-secondary border border-border rounded-lg transition-all hover:shadow-md"
            >
              <span className="size-12 flex items-center justify-center flex-shrink-0 border border-border rounded-md">
                <img
                  src={logoUrl}
                  alt={`${template.framework} Logo`}
                  className="h-7 w-7 flex-shrink-0 grayscale invert-0 dark:invert"
                />
              </span>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-base font-semibold">{template.title}</h3>
                <p className="text-sm text-muted-foreground mb-6">{template.description}</p>

                <ProjectBuilder template={template} />
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
};
