"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { TemplateGrid } from "./template-grid";
import { TemplateFilters } from "./template-filters";
import { templates, frameworks, useCases, cssFrameworks, databases } from "../data/templates";

export function TemplatesSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFramework, setSelectedFramework] = useState<string | null>(null);
  const [selectedUseCase, setSelectedUseCase] = useState<string | null>(null);
  const [selectedCSS, setSelectedCSS] = useState<string | null>(null);
  const [selectedDatabase, setSelectedDatabase] = useState<string | null>(null);

  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const matchesSearch =
        template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesFramework = !selectedFramework || template.framework === selectedFramework;
      const matchesUseCase = !selectedUseCase || template.useCase === selectedUseCase;
      const matchesCSS = !selectedCSS || template.css === selectedCSS;
      const matchesDatabase = !selectedDatabase || template.database === selectedDatabase;

      return matchesSearch && matchesFramework && matchesUseCase && matchesCSS && matchesDatabase;
    });
  }, [searchQuery, selectedFramework, selectedUseCase, selectedCSS, selectedDatabase]);

  const clearFilters = () => {
    setSelectedFramework(null);
    setSelectedUseCase(null);
    setSelectedCSS(null);
    setSelectedDatabase(null);
    setSearchQuery("");
  };

  const activeFiltersCount = [
    selectedFramework,
    selectedUseCase,
    selectedCSS,
    selectedDatabase
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen">
      {/* Header Section */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto max-w-screen-2xl">
          {/* Header with background elements */}
          <div className='border-x border-border py-24 px-10'>
            <h2 className="text-2xl font-semibold text-foreground mb-6">
              <span className="text-3xl text-muted pr-2">/</span>
              Templates
            </h2>
            <p className="text-muted-foreground max-w-md mb-5">
              Igniter.js is a collection of templates that help you get started with web development. Whether you're building a personal blog, an e-commerce platform, or a complex web application, Igniter.js has you covered.
            </p>

            {/* Search Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative"
            >
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-base bg-secondary rounded-full max-w-sm"
              />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto max-w-screen-2xl">
        <div className="flex flex-col lg:flex-row border-x border-border">
          {/* Sidebar Filters */}
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="lg:w-64 flex-shrink-0 border-r border-border"
          >
            <TemplateFilters
              frameworks={frameworks}
              useCases={useCases}
              cssFrameworks={cssFrameworks}
              databases={databases}
              selectedFramework={selectedFramework}
              selectedUseCase={selectedUseCase}
              selectedCSS={selectedCSS}
              selectedDatabase={selectedDatabase}
              onFrameworkChange={setSelectedFramework}
              onUseCaseChange={setSelectedUseCase}
              onCSSChange={setSelectedCSS}
              onDatabaseChange={setSelectedDatabase}
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
            <div className="py-5 px-10 flex items-center justify-between border-b">
              <div className="flex items-center gap-4">
                <h2 className="font-semibold">
                  {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
                </h2>
                {activeFiltersCount > 0 && (
                  <span className="text-sm text-muted-foreground">
                    ({activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''} applied)
                  </span>
                )}
              </div>
            </div>

            <div className="py-5 p-10">
              <TemplateGrid templates={filteredTemplates} />
            </div>
          </motion.main>
        </div>
      </div>
    </div>
  );
}