"use client";

import { DefaultChatTransport, generateId } from "ai";
import { useChat, useChatActions } from "@ai-sdk-tools/store";
import { type RefObject, useMemo, useRef, useState, useEffect } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "./conversation";
import { ChatHeader } from "./chat-header";
import { ChatInput, type ChatInputMessage } from "./chat-input";
import { ChatMessages } from "./chat-messages";
import { EmptyState } from "./empty-state";
import { SuggestionPills } from "../ai-elements/suggestion-pills";
import { SuggestedPrompts } from "./suggested-prompts";
import { useDataPart } from "@ai-sdk-tools/store";
import { cn } from "@/lib/utils";

interface ChatInterfaceProps {
  onClose: () => void;
  currentPage?: string;
}

export function ChatInterface({ onClose, currentPage }: ChatInterfaceProps) {
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentChatId) {
      setCurrentChatId(generateId());
    }
  }, [currentChatId]);

  const handleNewChat = () => {
    const newChatId = generateId();
    setCurrentChatId(newChatId);
    setNewChat(newChatId, []); // Reset the chat store with new ID and empty messages
    setText("");
    setAttachedPages(currentPage ? [currentPage] : []);
  };

  const [text, setText] = useState<string>("");
  const [attachedPages, setAttachedPages] = useState<string[]>(
    currentPage ? [currentPage] : []
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { messages, sendMessage, status, stop, setMessages } = useChat({
    id: currentChatId || "", // Use currentChatId
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest({ messages, id }) {
        const lastMessage = messages[messages.length - 1] as ChatInputMessage;

        return {
          body: {
            message: lastMessage,
            id,
            currentPage: lastMessage.metadata?.currentPage,
            attachedPages: lastMessage.metadata?.attachedPages || [],
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        };
      },
    }),
    onFinish(message) {
      if (!currentChatId) {
        setCurrentChatId(message.message.id);
      }
    },
  });

  const { setNewChat } = useChatActions();


  const hasMessages = messages.length > 0;

  const [suggestions] = useDataPart<{ prompts: string[] }>("suggestions");
  const hasSuggestions = suggestions?.prompts && suggestions.prompts.length > 0;

  const handleSubmit = (message: ChatInputMessage) => {
    if (status === "streaming" || status === "submitted") {
      stop();
      return;
    }

    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    if (!currentChatId) {
      console.error("Chat ID is null during message submission.");
      return;
    }

    sendMessage({
      text: message.text || "Sent with attachments",
      files: message.files,
      metadata: {
        currentPage: message.metadata?.currentPage,
        attachedPages: message.metadata?.attachedPages || [],
      },
    });
    setText("");
  };

  const handleAttachPage = () => {
    if (currentPage && !attachedPages.includes(currentPage)) {
      setAttachedPages([...attachedPages, currentPage]);
    }
  };

  const chatInput = (
    <ChatInput
      text={text}
      setText={setText}
      textareaRef={textareaRef as RefObject<HTMLTextAreaElement | null>}
      onSubmit={handleSubmit}
      status={status}
      hasMessages={hasMessages}
      currentPage={currentPage}
      attachedPages={attachedPages}
      onAttachPage={currentPage ? handleAttachPage : undefined}
    />
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <ChatHeader
        onClose={onClose}
        onNewChat={handleNewChat}
      />

      {/* Main chat area */}
      <div className="flex-1 relative overflow-hidden min-h-0">
        {hasMessages ? (
          <>
            {/* Conversation view */}
            <div className="absolute inset-0 flex flex-col">
              <Conversation>
                <ConversationContent className="!p-0 !pb-52 pt-4">
                  <div className="max-w-2xl mx-auto w-full px-4">
                    <ChatMessages
                      messages={messages}
                      isStreaming={
                        status === "streaming" || status === "submitted"
                      }
                    />
                  </div>
                </ConversationContent>
                <ConversationScrollButton
                  className={cn(hasSuggestions ? "!bottom-52" : "!bottom-48")}
                />
              </Conversation>
            </div>

            {/* Fixed input at bottom */}
            <div className="absolute bottom-0 left-0 right-0">
              <div className="w-full">
                <SuggestedPrompts delay={1} />
                {chatInput}
              </div>
            </div>
          </>
        ) : (
          <div className="absolute bottom-0 left-0 right-0">
            <div className="w-full space-y-4">
              <SuggestionPills />
              {chatInput}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

