"use client";

import { useDataPart } from "@ai-sdk-tools/store";
import { AnimatePresence, motion } from "motion/react";

interface ChatTitleData {
  chatId: string;
  title: string;
}

export function ChatTitle() {
  const [chatTitle] = useDataPart<ChatTitleData>("chat-title");

  return (
    <AnimatePresence mode="wait">
      {chatTitle?.title ? (
        <motion.div
          key={chatTitle.title}
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: "auto", opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="overflow-hidden"
        >
          <div className="text-xs font-medium text-foreground whitespace-nowrap">
            {chatTitle.title}
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="default"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: "auto", opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="overflow-hidden"
        >
          <div className="text-xs font-mono text-foreground whitespace-nowrap">
            Chat With Lia
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
