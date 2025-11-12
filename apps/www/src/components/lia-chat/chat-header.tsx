"use client";

import { PlusIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatTitle } from "./chat-title";

interface ChatHeaderProps {
  onClose: () => void;
  onNewChat: () => void;
}

export function ChatHeader({ onClose, onNewChat }: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b">
      <ChatTitle />
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onNewChat}>
          <PlusIcon className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8"
        >
          <XIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

