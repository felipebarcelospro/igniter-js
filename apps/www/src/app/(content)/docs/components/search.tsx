"use client";

import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ContentMetadata, ContentSection } from "@/lib/docs";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Search as SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

interface SearchProps extends React.HTMLAttributes<HTMLDivElement> {
  sections: ContentSection[];
}

export function Search({ className, sections }: SearchProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const navigateToContent = (item: ContentMetadata) => {
    router.push(item.slug);
    setOpen(false);
  };

  return (
    <motion.div
      className={cn("relative w-full", className)}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Button
        variant="secondary"
        className="relative h-9 w-full justify-start text-sm text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <SearchIcon className="mr-2 h-4 w-4" />
        Search content...
        <kbd className="pointer-events-none absolute right-1.5 top-2 hidden h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search content..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {sections.map((section) => (
            <CommandGroup
              key={`docs-${section.title}`}
              heading={`Docs - ${section.title}`}
            >
              {section.items.map((item) => (
                <CommandItem
                  key={`${item.type}-=-${item.slug}`}
                  onSelect={() => navigateToContent(item)}
                >
                  {item.title}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </motion.div>
  );
}
