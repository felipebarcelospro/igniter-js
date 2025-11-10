"use client";

import { useChatId } from "@ai-sdk-tools/store";
import type { ChatStatus } from "ai";
import { BookOpenIcon, InfinityIcon } from "lucide-react";
import { type RefObject } from "react";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputButton,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  PromptInputModelSelect,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputHeader,
} from "@/components/ai-elements/prompt-input";
import { Badge } from "../ui/badge";

export interface ChatInputMessage extends PromptInputMessage {
  metadata?: {
    currentPage?: string;
    attachedPages?: string[];
  };
}

interface ChatInputProps {
  text: string;
  setText: (text: string) => void;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
  onSubmit: (message: ChatInputMessage) => void;
  status?: ChatStatus;
  hasMessages: boolean;
  currentPage?: string;
  attachedPages?: string[];
  onAttachPage?: () => void;
}

export function ChatInput({
  text,
  setText,
  textareaRef,
  onSubmit,
  status,
  hasMessages,
  currentPage,
  attachedPages = [],
  onAttachPage,
}: ChatInputProps) {
  const handleSubmit = (message: PromptInputMessage) => {
    // Add current page and attached pages to metadata
    onSubmit({
      ...message,
      metadata: {
        currentPage,
        attachedPages,
      },
    });
  };

  return (
    <div className="space-y-2">
      {/* Show attached pages */}
      {attachedPages.length > 0 && (
        <div className="flex flex-wrap gap-2 px-2">
          {attachedPages.map((page, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-muted"
            >
              <BookOpenIcon className="size-3" />
              <span>{page.split("/").pop()}</span>
            </div>
          ))}
        </div>
      )}

      <PromptInput
        globalDrop
        multiple
        onSubmit={handleSubmit}
        className="bg-[#fafafa]/80 dark:bg-background/50 backdrop-blur-xl"
      >
        <PromptInputHeader className="p-1">
          <PromptInputActionMenu>
            <PromptInputActionMenuTrigger />
            <PromptInputActionMenuContent>
              <PromptInputActionAddAttachments />
            </PromptInputActionMenuContent>
          </PromptInputActionMenu>
          {onAttachPage && (
            <PromptInputButton onClick={onAttachPage} variant="ghost">
              <BookOpenIcon size={16} />
              <span>Attach Page</span>
            </PromptInputButton>
          )}
        </PromptInputHeader>

        <PromptInputBody>
          <PromptInputAttachments>
            {(attachment) => <PromptInputAttachment data={attachment} />}
          </PromptInputAttachments>
          <PromptInputTextarea
            onChange={(event) => setText(event.target.value)}
            ref={textareaRef}
            value={text}
            placeholder={
              hasMessages
                ? "Ask Lia anything about Igniter.js..."
                : "Hi! I'm Lia 👋 Ask me anything about Igniter.js!"
            }
            autoFocus
          />
        </PromptInputBody>

        <PromptInputFooter>
          <PromptInputTools>
            <Badge variant="outline"><InfinityIcon className="size-3" /> Agent</Badge>
            <PromptInputModelSelect onValueChange={() => { }} value="gemini-2.5-flash">
              <PromptInputModelSelectTrigger className="bg-transparent">
                <PromptInputModelSelectValue />
              </PromptInputModelSelectTrigger>
              <PromptInputModelSelectContent>
                <PromptInputModelSelectItem
                  key="gemini-2.5-flash"
                  value="gemini-2.5-flash"
                >
                  Gemini 2.5 Flash
                </PromptInputModelSelectItem>
              </PromptInputModelSelectContent>
            </PromptInputModelSelect>
          </PromptInputTools>
          <div>
            <PromptInputSubmit
              disabled={(!text.trim() && !status) || status === "streaming"}
              status={status}
            />
          </div>
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}

