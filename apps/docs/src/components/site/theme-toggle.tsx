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
    <div className="flex items-center w-40">
      {["light", "dark"].map((mode) => (
        <button
          key={mode}
          onClick={() => setTheme(mode)}
          className={cn(
            "h-7 px-3 w-1/2 text-sm flex items-center justify-center transition-all duration-200",
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
