"use client";

import { X, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TemplateFiltersMobileProps {
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

export function TemplateFiltersMobile({
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
}: TemplateFiltersMobileProps) {
  return (
    <div className="lg:hidden space-y-4 pb-4 border-b">
      {/* Filter Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          <h2 className="font-semibold text-sm">Filters</h2>
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

      {/* Framework Filter */}
      {frameworks.length > 0 && (
        <Select
          value={selectedFramework || "all"}
          onValueChange={(value) => onFrameworkChange(value === "all" ? null : value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Framework" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Frameworks</SelectItem>
            {frameworks.map((framework) => (
              <SelectItem key={framework} value={framework}>
                {framework}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Use Case Filter */}
      {useCases.length > 0 && (
        <Select
          value={selectedUseCase || "all"}
          onValueChange={(value) => onUseCaseChange(value === "all" ? null : value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Use Case" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Use Cases</SelectItem>
            {useCases.map((useCase) => (
              <SelectItem key={useCase} value={useCase}>
                {useCase}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* CSS Framework Filter */}
      {cssFrameworks.length > 0 && (
        <Select
          value={selectedCSS || "all"}
          onValueChange={(value) => onCSSChange(value === "all" ? null : value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="CSS Framework" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All CSS Frameworks</SelectItem>
            {cssFrameworks.map((css) => (
              <SelectItem key={css} value={css}>
                {css}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Database Filter */}
      {databases.length > 0 && (
        <Select
          value={selectedDatabase || "all"}
          onValueChange={(value) => onDatabaseChange(value === "all" ? null : value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Database" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Databases</SelectItem>
            {databases.map((database) => (
              <SelectItem key={database} value={database}>
                {database}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

