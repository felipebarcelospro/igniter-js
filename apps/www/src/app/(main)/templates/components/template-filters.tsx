"use client";

import { motion } from "framer-motion";
import { X, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface TemplateFiltersProps {
  frameworks: string[];
  useCases: string[];
  cssFrameworks: string[];
  databases: string[];
  selectedFramework: string | null;
  selectedUseCase: string | null;
  selectedCSS: string | null;
  selectedDatabase: string | null;
  onFrameworkChange: (framework: string | null) => void;
  onUseCaseChange: (useCase: string | null) => void;
  onCSSChange: (css: string | null) => void;
  onDatabaseChange: (database: string | null) => void;
  onClearFilters: () => void;
  activeFiltersCount: number;
}

interface FilterSectionProps {
  title: string;
  options: string[];
  selectedValue: string | null;
  onChange: (value: string | null) => void;
}

function FilterSection({ title, options, selectedValue, onChange }: FilterSectionProps) {
  return (
    <div className="space-y-3 px-10">
      <h3 className="font-medium text-sm text-foreground">{title}</h3>
      <div className="space-y-2">
        {options.map((option) => {
          const isSelected = selectedValue === option;
          return (
            <motion.button
              key={option}
              onClick={() => onChange(isSelected ? null : option)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all duration-200 ${
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-secondary text-muted-foreground hover:text-foreground"
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {option}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

export function TemplateFilters({
  frameworks,
  useCases,
  cssFrameworks,
  databases,
  selectedFramework,
  selectedUseCase,
  selectedCSS,
  selectedDatabase,
  onFrameworkChange,
  onUseCaseChange,
  onCSSChange,
  onDatabaseChange,
  onClearFilters,
  activeFiltersCount,
}: TemplateFiltersProps) {
  return (
    <div className="space-y-5 pt-5">
      {/* Filter Header */}
      <div className="flex items-center justify-between px-10">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          <h2 className="font-semibold">Filters</h2>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </div>
        
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="w-3 h-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      <Separator />

      {/* Framework Filter */}
      <FilterSection
        title="Framework"
        options={frameworks}
        selectedValue={selectedFramework}
        onChange={onFrameworkChange}
      />

      <Separator />

      {/* Use Case Filter */}
      <FilterSection
        title="Use Case"
        options={useCases}
        selectedValue={selectedUseCase}
        onChange={onUseCaseChange}
      />

      <Separator />

      {/* CSS Framework Filter */}
      <FilterSection
        title="CSS"
        options={cssFrameworks}
        selectedValue={selectedCSS}
        onChange={onCSSChange}
      />

      <Separator />

      {/* Database Filter */}
      <FilterSection
        title="Database"
        options={databases}
        selectedValue={selectedDatabase}
        onChange={onDatabaseChange}
      />

      {/* Mobile Clear Button */}
      {activeFiltersCount > 0 && (
        <div className="lg:hidden">
          <Button
            variant="outline"
            onClick={onClearFilters}
            className="w-full"
          >
            <X className="w-4 h-4 mr-2" />
            Clear All Filters
          </Button>
        </div>
      )}
    </div>
  );
}