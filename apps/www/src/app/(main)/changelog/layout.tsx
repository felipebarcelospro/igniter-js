import React from 'react';
import { cn } from '@/lib/utils';

// This would ideally be dynamic, but for this task, it's hardcoded.
const ChangelogSidebar = () => {
  const versions = ["v0.2.1", "v0.2.0", "v0.1.0"];
  return (
    <div className="sticky top-28">
      <h3 className="text-sm font-semibold text-foreground mb-4 pl-4">On this page</h3>
      <ul className="space-y-1">
        {versions.map((version) => (
          <li key={version}>
            <a
              href={`#${version.replace(/\./g, '-')}`}
              className={cn(
                "block border-l-2 border-transparent pl-4 pr-2 py-1.5 text-sm text-muted-foreground",
                "hover:text-foreground hover:border-primary transition-colors duration-200"
              )}
            >
              {version}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default function ChangelogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative isolate overflow-hidden">
      {/* Header with background elements */}
      <div className="border-b border-border">
        <div className="container mx-auto max-w-screen-2xl">
          <div className='border-x py-24 px-10'>
            <h2 className="text-2xl font-semibold text-foreground mb-6">
              <span className="text-3xl text-muted pr-2">/</span>
              Changelog
            </h2>
            <p className="text-muted-foreground max-w-md">
              All notable changes, new features, and bug fixes for Igniter.js. We are committed to transparency and keeping our community informed.
            </p>
          </div>
        </div>
      </div>

      {/* Main content with sidebar */}
      <div className="container mx-auto max-w-screen-2xl">
        <div className='border-x px-10'>
          <div className="lg:grid lg:grid-cols-12 lg:gap-8">
            <aside className="hidden lg:col-span-3 lg:block py-10">
              <ChangelogSidebar />
            </aside>
            <main className="lg:col-span-9 py-10">
              <div className="markdown-content">
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
