'use client';

import { useEffect, useState, useCallback } from "react";
import { ChatInterface } from "./chat-interface";
import { Provider } from "@ai-sdk-tools/store";
import { AIDevtools } from "@ai-sdk-tools/devtools";
import { cn } from "@/lib/utils";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "../ui/resizable";

const CHAT_WIDTH_STORAGE_KEY = 'lia-chat-width';
const DEFAULT_CHAT_WIDTH = 400;
const MIN_CHAT_WIDTH = 300;
const MAX_CHAT_WIDTH = 800;
const COLLAPSED_WIDTH = 40;

export function ChatLayout({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [chatWidth, setChatWidth] = useState(DEFAULT_CHAT_WIDTH);
  const [viewportWidth, setViewportWidth] = useState(1920);

  // Add/remove .chat-open class to body based on chat state
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('chat-open');
    } else {
      document.body.classList.remove('chat-open');
    }
    return () => {
      document.body.classList.remove('chat-open');
    };
  }, [isOpen]);

  // Update viewport width on resize
  useEffect(() => {
    const updateViewportWidth = () => {
      setViewportWidth(window.innerWidth);
    };

    updateViewportWidth();
    window.addEventListener('resize', updateViewportWidth);
    return () => window.removeEventListener('resize', updateViewportWidth);
  }, []);

  // Listen for custom event to open chat
  useEffect(() => {
    const handleOpenChat = () => {
      setIsOpen(true);
    };

    window.addEventListener('openChatSidebar', handleOpenChat);

    return () => {
      window.removeEventListener('openChatSidebar', handleOpenChat);
    };
  }, []);

  // Load saved width from localStorage on mount
  useEffect(() => {
    const savedWidth = localStorage.getItem(CHAT_WIDTH_STORAGE_KEY);
    if (savedWidth) {
      const width = parseInt(savedWidth, 10);
      if (width >= MIN_CHAT_WIDTH && width <= MAX_CHAT_WIDTH) {
        setChatWidth(width);
      }
    }
  }, []);

  // Convert pixels to percentage
  const pixelsToPercentage = useCallback((pixels: number, totalWidth: number) => {
    return Math.max(0, Math.min(100, (pixels / totalWidth) * 100));
  }, []);

  // Convert percentage to pixels
  const percentageToPixels = useCallback((percentage: number, totalWidth: number) => {
    return (percentage / 100) * totalWidth;
  }, []);

  // Get initial panel size in percentage
  const getInitialChatPanelSize = useCallback(() => {
    const clampedWidth = Math.max(MIN_CHAT_WIDTH, Math.min(MAX_CHAT_WIDTH, chatWidth));
    return pixelsToPercentage(clampedWidth, viewportWidth);
  }, [chatWidth, viewportWidth, pixelsToPercentage]);

  // Handle resize event
  const handleResize = useCallback((sizePercentage: number) => {
    const newWidth = percentageToPixels(sizePercentage, viewportWidth);
    const clampedWidth = Math.max(MIN_CHAT_WIDTH, Math.min(MAX_CHAT_WIDTH, newWidth));
    
    setChatWidth(clampedWidth);
    localStorage.setItem(CHAT_WIDTH_STORAGE_KEY, clampedWidth.toString());
  }, [viewportWidth, percentageToPixels]);

  // Calculate collapsed panel size in percentage
  const getCollapsedPanelSize = useCallback(() => {
    return pixelsToPercentage(COLLAPSED_WIDTH, viewportWidth);
  }, [viewportWidth, pixelsToPercentage]);

  // Calculate min/max sizes in percentage
  const minChatPanelSize = pixelsToPercentage(MIN_CHAT_WIDTH, viewportWidth);
  const maxChatPanelSize = pixelsToPercentage(MAX_CHAT_WIDTH, viewportWidth);

  return (
    <Provider>
      <ResizablePanelGroup
        direction="horizontal"
        className="flex flex-1 relative"
      >
        {/* Main content panel */}
        <ResizablePanel 
          defaultSize={isOpen ? 100 - getInitialChatPanelSize() : 100 - getCollapsedPanelSize()} 
          minSize={60}
        >
          <main className="flex-1 h-[calc(100vh-56px)] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {children}
            {process.env.NODE_ENV === "development" && <AIDevtools />}
          </main>
        </ResizablePanel>

        {/* Resizable handle - only visible when chat is open */}
        {isOpen && (
          <ResizableHandle className="sticky top-0" withHandle />
        )}

        {/* Chat sidebar panel */}
        <ResizablePanel
          key={isOpen ? 'open' : 'closed'}
          defaultSize={isOpen ? getInitialChatPanelSize() : getCollapsedPanelSize()}
          minSize={isOpen ? minChatPanelSize : getCollapsedPanelSize()}
          maxSize={isOpen ? maxChatPanelSize : getCollapsedPanelSize()}
          onResize={isOpen ? handleResize : undefined}
          className="flex flex-col"
        >
          {isOpen ? (
            <div
              className={cn([
                "sticky top-0 z-10 flex flex-col",
                "h-full",
              ])}
            >
              <ChatInterface onClose={() => setIsOpen(false)} />
            </div>
          ) : (
            <div
              className={cn([
                "sticky top-14 z-50 border-border h-[calc(100vh-56px)] border-l transition-all duration-200 ease-in-out flex flex-col justify-between hover:bg-secondary hidden md:block",
              ])}
            >
              <div className="h-full flex items-center justify-center" onClick={() => setIsOpen(true)}>
                <button
                  className="inline-flex shrink-0 items-center justify-center whitespace-nowrap font-medium text-sm outline-none transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0 hover:text-accent-foreground dark:hover:bg-accent/50 gap-1 rounded-md has-[>svg]:px-1.5 bg-background hover:bg-muted h-8 w-8 p-0"
                  data-slot="button"
                  type="button"
                  title="Expand Chat Sidebar"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-panel-right-open h-4 w-4"
                    aria-hidden="true"
                  >
                    <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                    <path d="M15 3v18"></path>
                    <path d="m10 15-3-3 3-3"></path>
                  </svg>
                </button>
              </div>
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </Provider>
  );
}