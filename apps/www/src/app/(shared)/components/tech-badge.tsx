"use client";

import { FlipWords } from "@/components/ui/flip-words";
import { motion } from "framer-motion";

interface TechBadgeProps {
  name?: string;
  animated?: boolean;
}

export function TechBadge({ name, animated = false }: TechBadgeProps) {
  if (animated) {
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

  return (
    <motion.span 
      className="inline-flex items-center px-3 py-1 bg-secondary/50 text-secondary-foreground rounded-full text-xs font-medium border border-border/50 hover:bg-secondary/70 transition-colors"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {name}
    </motion.span>
  );
}
