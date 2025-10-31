"use client";

import { useState, useEffect } from "react";
import { ChatInterface } from "./chat-interface";
import { usePathname } from "next/navigation";

export function ChatSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar when navigating to a different page
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Listen for custom event to open chat sidebar
  useEffect(() => {
    const handleOpenChatSidebar = () => {
      setIsOpen(true);
    };

    window.addEventListener('openChatSidebar', handleOpenChatSidebar);

    return () => {
      window.removeEventListener('openChatSidebar', handleOpenChatSidebar);
    };
  }, []);

  return (
    <div
      className="fixed top-0 right-0 hover:bg-secondary z-50 border-border h-full border-l transition-all duration-200 ease-in-out flex flex-col justify-between"
      style={{ width: isOpen ? "400px" : "40px" }}
    >
      {!isOpen && (
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
      )}
      {isOpen && (
        <div className="h-full w-full pt-14">
          <ChatInterface onClose={() => setIsOpen(false)} />
        </div>
      )}
    </div>
  );
}

