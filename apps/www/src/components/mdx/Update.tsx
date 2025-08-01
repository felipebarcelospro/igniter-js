import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface UpdateProps {
  children: ReactNode;
  tag?: string;
  version?: string;
  title?: string;
  description?: string;
}

export const Update: React.FC<UpdateProps> = ({ children, tag, version, title, description }) => {
  return (
    <section className="grid grid-cols-12 gap-x-8 gap-y-4 py-10 border-b border-border">
      {/* Left Column: Tag and Version */}
      <div className="col-span-12 md:col-span-3 text-left md:text-right">
        {tag && (
          <div className="inline-block rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            {tag}
          </div>
        )}
        {version && (
          <p className="mt-2 text-sm text-muted-foreground">
            {version}
          </p>
        )}
      </div>

      {/* Right Column: Title, Description, and Content */}
      <div className="col-span-12 md:col-span-9">
        {title && (
          <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
        )}
        {description && (
          <p className="text-muted-foreground mb-4">{description}</p>
        )}
        <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
          {children}
        </div>
      </div>
    </section>
  );
};
