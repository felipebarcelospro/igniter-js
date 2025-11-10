"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { TemplateGrid } from "./template-grid";
import { TemplateFilters } from "./template-filters";
import { TemplateFiltersMobile } from "./template-filters-mobile";
import type { SerializableTemplate } from "../(lib)/template-utils";

interface TemplatesSectionProps {
  templates: SerializableTemplate[];
}

export function TemplatesSection({ templates }: TemplatesSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFramework, setSelectedFramework] = useState<string | null>(
    null,
  );
  const [selectedUseCase, setSelectedUseCase] = useState<string | null>(null);

  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const matchesSearch =
        template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (template.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        template.stack.some((tag) =>
          tag.toLowerCase().includes(searchQuery.toLowerCase()),
        );

      const matchesFramework =
        !selectedFramework || template.framework === selectedFramework;
      const matchesUseCase =
        !selectedUseCase || template.useCases.includes(selectedUseCase);

      return (
        matchesSearch &&
        matchesFramework &&
        matchesUseCase
      );
    });
  }, [
    templates,
    searchQuery,
    selectedFramework,
    selectedUseCase,
  ]);

  const clearFilters = () => {
    setSelectedFramework(null);
    setSelectedUseCase(null);
    setSearchQuery("");
  };

  const activeFiltersCount = [
    selectedFramework,
    selectedUseCase,
  ].filter(Boolean).length;

  // Extract unique values for filters
  const frameworks = Array.from(new Set(templates.map(t => t.framework)));
  const useCases = Array.from(new Set(templates.flatMap(t => t.useCases)));

  return (
    <div>
      {/* Main Content */}
      <div className="container mx-auto max-w-5xl py-8">
        {/* Mobile Filters */}
        <div className="lg:hidden px-4 pt-4">
          <TemplateFiltersMobile
            frameworks={frameworks}
            useCases={useCases}
            cssFrameworks={[]}
            databases={[]}
            selectedFramework={selectedFramework}
            selectedUseCase={selectedUseCase}
            selectedCSS={null}
            selectedDatabase={null}
            onFrameworkChange={setSelectedFramework}
            onUseCaseChange={setSelectedUseCase}
            onCSSChange={() => {}}
            onDatabaseChange={() => {}}
            onClearFilters={clearFilters}
            activeFiltersCount={activeFiltersCount}
          />
        </div>

        <div className="flex flex-col lg:flex-row">
          {/* Sidebar Filters - Desktop Only */}
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="hidden lg:block lg:w-[15.5rem] flex-shrink-0 lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto"
          >
            <TemplateFilters
              frameworks={frameworks}
              useCases={useCases}
              cssFrameworks={[]}
              databases={[]}
              selectedFramework={selectedFramework}
              selectedUseCase={selectedUseCase}
              selectedCSS={null}
              selectedDatabase={null}
              onFrameworkChange={setSelectedFramework}
              onUseCaseChange={setSelectedUseCase}
              onCSSChange={() => {}}
              onDatabaseChange={() => {}}
              onClearFilters={clearFilters}
              activeFiltersCount={activeFiltersCount}
            />
          </motion.aside>

          {/* Templates Grid */}
          <motion.main
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex-1"
          >
            <div className="py-5 px-4 lg:px-10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="font-semibold">
                  {filteredTemplates.length} template
                  {filteredTemplates.length !== 1 ? "s" : ""}
                </h2>
                {activeFiltersCount > 0 && (
                  <span className="text-sm text-muted-foreground">
                    ({activeFiltersCount} filter
                    {activeFiltersCount !== 1 ? "s" : ""} applied)
                  </span>
                )}
              </div>
            </div>

            <div className="py-5 px-4 lg:px-10">
              <TemplateGrid templates={filteredTemplates} />
            </div>
          </motion.main>
        </div>
      </div>
    </div>
  );
}
