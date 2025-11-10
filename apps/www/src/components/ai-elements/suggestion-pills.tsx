"use client";

import { useChatId } from "@ai-sdk-tools/store";
import { useChatActions } from "@ai-sdk-tools/store";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";

const SUGGESTIONS = [
  { text: "How do I create a controller?" },
  { text: "What's the difference between query and mutation?" },
  { text: "How does end-to-end type safety work?" },
  { text: "Show me how to add real-time updates" },
  { text: "How do I set up Redis caching?" },
  { text: "What's the feature-sliced architecture?" },
  { text: "How do I integrate with Next.js?" },
  { text: "Tell me about background jobs with BullMQ" },
  { text: "How does Lia help with development?" },
  { text: "What are MCP Server tools?" },
  { text: "How do I add middleware to my API?" },
  { text: "Show me testing strategies" },
];

type Suggestion = (typeof SUGGESTIONS)[number];

export function SuggestionPills() {
  const { sendMessage } = useChatActions();
  const chatId = useChatId();

  const handleSuggestionClick = (suggestion: Suggestion) => {
    sendMessage({
      text: suggestion.text,
    });
  };

  return (
    <div className="flex flex-col gap-2 px-3">
      {SUGGESTIONS.map((suggestion, index) => (
        <motion.div
          key={suggestion.text}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.2,
            delay: 0.3 + index * 0.05,
            ease: "easeOut",
          }}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSuggestionClick(suggestion)}
            className="rounded-full text-xs font-normal text-muted-foreground/60 hover:bg-accent"
          >
            {suggestion.text}
          </Button>
        </motion.div>
      ))}
    </div>
  );
}
