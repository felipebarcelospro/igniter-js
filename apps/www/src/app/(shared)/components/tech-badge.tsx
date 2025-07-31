"use client";

import { FlipWords } from "@/components/ui/flip-words";

export function TechBadge() {
  return (
    <span className="inline-flex items-center mx-1 sm:mx-2 px-2 sm:px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm sm:text-md relative overflow-hidden">
      <FlipWords
        words={["Deno", "Bun", "Node.js"]}
        interval={2000}
        className="text-secondary-foreground"
      />
    </span>
  );
}
