"use client";

import { cn } from "@/lib/utils";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex items-center w-40 bg-transparent border border-border rounded-md p-1 pr-2 shadow-sm space-x-1">
      {["light", "dark"].map((mode) => (
        <button
          key={mode}
          onClick={() => setTheme(mode)}
          className={cn(
            "h-7 px-3 w-1/2 text-sm rounded-sm border border-border flex items-center justify-center transition-all duration-200",
            theme === mode &&
              "bg-secondary dark:bg-zinc-700 text-gray-900 dark:text-zinc-100 shadow-sm",
            theme !== mode && "border-none",
          )}
        >
          {mode === "light" ? (
            <>
              <Sun size={14} className="mr-2" />
              Light
            </>
          ) : (
            <>
              <Moon size={14} className="mr-2" />
              Dark
            </>
          )}
        </button>
      ))}
    </div>
  );
}
