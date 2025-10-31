"use client";

import type { UIMessage, ToolUIPart } from "ai";
import { PaperclipIcon, SearchIcon, FileTextIcon, ListIcon, ChevronDownIcon, FileIcon, HashIcon, TextIcon, XIcon } from "lucide-react";
import Image from "next/image";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { Response } from "@/components/ai-elements/response";
import { Task, TaskTrigger, TaskContent, TaskItem, TaskItemFile } from "@/components/ai-elements/task";
import { Reasoning, ReasoningTrigger, ReasoningContent } from "@/components/ai-elements/reasoning";
import { Loader } from "@/components/ai-elements/loader";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { useEffect, useState } from "react";

interface ChatMessagesProps {
  messages: UIMessage[];
  isStreaming?: boolean;
}

interface SourceItem {
  url: string;
  title: string;
}

/**
 * Extract file parts from message
 */
function extractFileParts(parts: UIMessage["parts"]) {
  return parts.filter((part) => part.type === "file");
}

/**
 * Extract source-url parts from AI SDK
 */
function extractAiSdkSources(parts: UIMessage["parts"]): SourceItem[] {
  const sources: SourceItem[] = [];

  for (const part of parts) {
    if (part.type === "source-url") {
      const sourcePart = part as { url: string; title?: string };
      sources.push({
        url: sourcePart.url,
        title: sourcePart.title || sourcePart.url,
      });
    }
  }

  return sources;
}

/**
 * Extract reasoning parts from message
 */
function extractReasoningParts(parts: UIMessage["parts"]): Array<{ text: string }> {
  return parts
    .filter((part) => part.type === "reasoning")
    .map((part) => ({
      text: "text" in part ? String(part.text) : "",
    }));
}

/**
 * Extract tool name from tool part type (e.g., "tool-searchDocs" -> "searchDocs")
 */
function extractToolName(type: string): string | null {
  if (type.startsWith("tool-")) {
    return type.replace("tool-", "");
  }
  return null;
}

/**
 * Extract tool parts from message, excluding suggestNavigation
 */
function extractToolParts(parts: UIMessage["parts"]): ToolUIPart[] {
  const toolsToDisplay = ["searchDocs", "getPageContent", "listPages"];
  
  return parts.filter((part): part is ToolUIPart => {
    if (!part.type.startsWith("tool-")) return false;
    const toolName = extractToolName(part.type);
    return toolName !== null && toolsToDisplay.includes(toolName);
  });
}

/**
 * Get display name for tool
 */
function getToolDisplayName(toolName: string): string {
  const displayNames: Record<string, string> = {
    searchDocs: "Searching documentation",
    getPageContent: "Retrieving page content",
    listPages: "Listing pages",
  };
  return displayNames[toolName] || toolName;
}

/**
 * Get icon component for tool
 */
function getToolIconComponent(toolName: string) {
  const icons: Record<string, typeof SearchIcon> = {
    searchDocs: SearchIcon,
    getPageContent: FileTextIcon,
    listPages: ListIcon,
  };
  return icons[toolName] || SearchIcon;
}

/**
 * Format tool output for display
 */
function formatToolOutput(toolName: string, output: unknown): React.ReactNode {
  if (!output) return null;

  // Handle searchDocs output (Fumadocs SortedResult[])
  if (toolName === "searchDocs") {
    // Check if it's an error response
    if (output && typeof output === 'object' && 'error' in output) {
      const errorResult = output as { found: boolean; error: string };
      return <TaskItem className="text-destructive">{errorResult.error}</TaskItem>;
    }
    
    // Handle array of SortedResult from Fumadocs
    if (Array.isArray(output)) {
      const results = output as Array<{
        id: string;
        url: string;
        type: 'page' | 'heading' | 'text';
        content: string;
        breadcrumbs?: string[];
      }>;
      
      if (results.length === 0) {
        return <TaskItem>No results found</TaskItem>;
      }
      
      return (
        <div className="space-y-2">
          <TaskItem>Found {results.length} relevant section{results.length > 1 ? 's' : ''}</TaskItem>
          {results.slice(0, 3).map((result, idx) => {
            // Clean breadcrumbs - remove hash fragments and technical IDs
            const cleanBreadcrumbs = result.breadcrumbs
              ?.map(crumb => {
                // Remove everything after # (hash fragments)
                const cleaned = crumb.split('#')[0].trim();
                return cleaned;
              })
              .filter(crumb => crumb.length > 0) || [];
            
            // If no clean breadcrumbs, extract title from URL and capitalize
            let breadcrumb = '';
            if (cleanBreadcrumbs.length > 0) {
              breadcrumb = cleanBreadcrumbs.join(' > ');
            } else {
              const slug = result.url.split('/').filter(Boolean).pop() || 'Documentation';
              // Capitalize: "job-monitoring" -> "Job Monitoring"
              breadcrumb = slug
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            }
            
            // Clean preview - get first meaningful line
            const contentLines = result.content.split('\n').filter(line => line.trim().length > 0);
            const preview = contentLines[0]?.slice(0, 120) || result.content.slice(0, 120);
            
            // Icon based on type
            const TypeIcon = result.type === 'page' ? FileIcon : result.type === 'heading' ? HashIcon : TextIcon;
            
            return (
              <div key={result.id || idx} className="space-y-1">
                <TaskItem className="text-xs font-medium flex items-center gap-1.5">
                  <TypeIcon className="size-3 shrink-0" />
                  {breadcrumb}
                </TaskItem>
                <TaskItem className="text-xs opacity-70 pl-4">
                  {preview}{preview.length === 120 ? '...' : ''}
                </TaskItem>
              </div>
            );
          })}
          {results.length > 3 && (
            <TaskItem className="text-xs opacity-60">
              +{results.length - 3} more result{results.length - 3 > 1 ? 's' : ''}
            </TaskItem>
          )}
        </div>
      );
    }
    
    return <TaskItem>No results found</TaskItem>;
  }
  
  // Handle getPageContent output
  if (toolName === "getPageContent") {
    const result = output as { found?: boolean; path?: string; url?: string; message?: string; error?: string };
    
    if (result.error) {
      return <TaskItem className="text-destructive">{result.error}</TaskItem>;
    }
    
    if (!result.found) {
      return <TaskItem>{result.message || "Page not found"}</TaskItem>;
    }
    
    return (
      <TaskItem>
        Retrieved content from <TaskItemFile>{result.path}</TaskItemFile>
      </TaskItem>
    );
  }
  
  // Handle listPages output  
  if (toolName === "listPages") {
    const result = output as { 
      found?: boolean; 
      pages?: Array<string | { path?: string; title?: string; category?: string }>; 
      message?: string; 
      error?: string 
    };
    
    if (result.error) {
      return <TaskItem className="text-destructive">{result.error}</TaskItem>;
    }
    
    if (!result.found || !result.pages || result.pages.length === 0) {
      return <TaskItem>{result.message || "No pages found"}</TaskItem>;
    }
    
    return (
      <div className="space-y-2">
        <TaskItem>Found {result.pages.length} page{result.pages.length > 1 ? 's' : ''}</TaskItem>
        {result.pages.slice(0, 3).map((page, idx) => {
          // Handle both string and object formats
          const pageDisplay = typeof page === 'string' 
            ? page 
            : page.title || page.path || 'Unknown page';
          
          return (
            <TaskItem key={idx}>
              <TaskItemFile>{pageDisplay}</TaskItemFile>
            </TaskItem>
          );
        })}
      </div>
    );
  }
  
  // Default: show as JSON
  return <TaskItem className="text-xs">{JSON.stringify(output)}</TaskItem>;
}

/**
 * Component to render a tool call as a Task
 */
function TaskRenderer({ toolPart }: { toolPart: ToolUIPart }) {
  const { type, state } = toolPart;
  
  const toolName = extractToolName(type) || "unknown";
  const output = "output" in toolPart ? toolPart.output : undefined;
  const errorText = "errorText" in toolPart ? toolPart.errorText : undefined;
  
  const displayName = getToolDisplayName(toolName);
  const DefaultIconComponent = getToolIconComponent(toolName);
  
  // Determine if task should be open
  const isRunning = state === "input-streaming";
  const hasError = state === "output-error" || !!errorText;
  const isCompleted = state === "output-available";

  
  // Task should be open during execution, can be collapsed after  
  const [isOpen, setIsOpen] = useState(isRunning);

  useEffect(() => {
    if (isCompleted) setIsOpen(false);
  }, [isRunning]);
  
  return (
    <Task open={isOpen} onOpenChange={setIsOpen} className="mb-2">
      <TaskTrigger title={displayName}>
        <div className="flex w-full cursor-pointer items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground group">
          {isRunning ? (
            <Loader size={14} />
          ) : hasError ? (
            <XIcon className="size-4 text-destructive" />
          ) : (
            <DefaultIconComponent className="size-4" />
          )}
          <p className="text-sm flex-1">{displayName}</p>
          <ChevronDownIcon className="size-4 transition-transform group-data-[state=open]:rotate-180 ml-2" />
        </div>
      </TaskTrigger>
      <TaskContent>
        {hasError && errorText && (
          <TaskItem className="text-destructive">{errorText}</TaskItem>
        )}
        {isCompleted && !hasError && formatToolOutput(toolName, output)}
        {isRunning && <TaskItem className="opacity-60">Processing...</TaskItem>}
      </TaskContent>
    </Task>
  );
}

export function ChatMessages({
  messages,
  isStreaming = false,
}: ChatMessagesProps) {
  // Check if we should show "thinking" shimmer
  const isLastMessage = messages.length > 0;
  const lastMessage = messages[messages.length - 1];
  const isThinking = isStreaming && isLastMessage && lastMessage?.role === "assistant" && 
    lastMessage.parts.every(part => 
      (part.type === "text" && (!("text" in part) || part.text === "")) ||
      part.type.startsWith("tool-") ||
      part.type === "reasoning"
    );
  
  return (
    <>
      {messages.map(({ parts, ...message }, index) => {
        // Extract text parts
        const textParts = parts.filter((part) => part.type === "text");
        const textContent = textParts
          .map((part) => (part.type === "text" ? part.text : ""))
          .join("");

        // Extract file parts
        const fileParts = extractFileParts(parts);

        // Extract reasoning parts
        const reasoningParts = extractReasoningParts(parts);
        const reasoningContent = reasoningParts
          .map((part) => part.text)
          .join("\n\n");

        // Extract tool parts
        const toolParts = extractToolParts(parts);

        // Extract sources from AI SDK
        const sources = extractAiSdkSources(parts);

        // Check if this is the last (currently streaming) message
        const isLastMessage = index === messages.length - 1;

        // Determine if reasoning is currently streaming
        const isReasoningStreaming = 
          isLastMessage && 
          isStreaming && 
          reasoningContent.length > 0;

        // Show sources only after response is finished
        const shouldShowSources =
          sources.length > 0 &&
          message.role === "assistant" &&
          (!isLastMessage || !isStreaming);

        return (
          <div key={message.id}>
            {/* Render file attachments */}
            {fileParts.length > 0 && (
              <Message from={message.role}>
                <MessageContent variant="flat">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {fileParts.map((part) => {
                      if (part.type !== "file") return null;

                      const file = part as {
                        type: "file";
                        url?: string;
                        mediaType?: string;
                        filename?: string;
                      };

                      const fileKey = `${file.url}-${file.filename}`;
                      const isImage = file.mediaType?.startsWith("image/");

                      if (isImage && file.url) {
                        return (
                          <div
                            key={fileKey}
                            className="relative rounded-lg border overflow-hidden"
                          >
                            <Image
                              src={file.url}
                              alt={file.filename || "attachment"}
                              className="max-w-xs max-h-48 object-cover"
                              width={300}
                              height={192}
                              unoptimized
                            />
                          </div>
                        );
                      }

                      return (
                        <div
                          key={fileKey}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/50"
                        >
                          <PaperclipIcon className="size-4 shrink-0 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {file.filename || "Unknown file"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </MessageContent>
              </Message>
            )}

            {/* Render reasoning (agent thinking) */}
            {reasoningContent.length > 0 && message.role === "assistant" && (
              <div className="mb-2">
                <Reasoning isStreaming={isReasoningStreaming}>
                  <ReasoningTrigger />
                  <ReasoningContent>{reasoningContent}</ReasoningContent>
                </Reasoning>
              </div>
            )}

            {/* Render tool calls as tasks */}
            {toolParts.length > 0 && message.role === "assistant" && (
              <div className="mb-2">
                {toolParts.map((toolPart, idx) => (
                  <TaskRenderer key={`${toolPart.toolCallId}-${idx}`} toolPart={toolPart} />
                ))}
              </div>
            )}

            {/* Render text content in message */}
            {textParts.length > 0 && (
              <Message from={message.role}>
                <MessageContent variant="flat">
                  <Response>{textContent}</Response>
                </MessageContent>
              </Message>
            )}

            {/* Render sources if available */}
            {shouldShowSources && (
              <div className="mt-2">
                <div className="flex flex-wrap gap-2">
                  {sources.map((source, idx) => (
                    <a
                      key={idx}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-foreground underline"
                    >
                      {source.title}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
      
      {/* Show thinking shimmer when AI is thinking but hasn't produced content yet */}
      {isThinking && (
        <Message from="assistant">
          <MessageContent variant="flat">
            <Shimmer duration={2}>Thinking...</Shimmer>
          </MessageContent>
        </Message>
      )}
    </>
  );
}




