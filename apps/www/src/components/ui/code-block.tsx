"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import hljs from "highlight.js";
import { Check, Copy } from "lucide-react";
import * as React from "react";
import { Button } from "./button";

interface TechnologyOption {
  id: string;
  name: string;
  icon: React.ReactNode;
  code: string;
  language?: string;
}

interface CodeBlockContextValue {
  activeTech: string;
  setActiveTech: (tech: string) => void;
  copied: boolean;
  setCopied: (copied: boolean) => void;
  technologies: TechnologyOption[];
}

const CodeBlockContext = React.createContext<CodeBlockContextValue | undefined>(
  undefined,
);

function useCodeBlock() {
  const context = React.useContext(CodeBlockContext);
  if (!context) {
    throw new Error("useCodeBlock must be used within a CodeBlockProvider");
  }
  return context;
}

const CodeBlock = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    technologies: TechnologyOption[];
    defaultTech?: string;
  }
>(
  (
    { className, technologies, defaultTech = technologies[0]?.id, ...props },
    ref,
  ) => {
    const [activeTech, setActiveTech] = React.useState(defaultTech);
    const [copied, setCopied] = React.useState(false);

    return (
      <CodeBlockContext.Provider
        value={{
          activeTech,
          setActiveTech,
          copied,
          setCopied,
          technologies,
        }}
      >
        <div
          ref={ref}
          className={cn(
            "relative border border-border rounded-md overflow-hidden shadow transition-colors duration-300",
            copied ? "bg-green-950" : "bg-secondary/30",
            className,
          )}
          {...props}
        />
      </CodeBlockContext.Provider>
    );
  },
);
CodeBlock.displayName = "CodeBlock";

const CodeBlockHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  const { activeTech, setActiveTech, copied, setCopied, technologies } =
    useCodeBlock();

  const handleCopy = () => {
    const activeTechCode = technologies.find((t) => t.id === activeTech)?.code;
    if (activeTechCode) {
      navigator.clipboard.writeText(activeTechCode.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-2 bg-secondary/20 border-b border-border",
        className,
      )}
      {...props}
    >
      <div className="flex space-x-2">
        <div className="w-3 h-3 rounded-full bg-red-500 hover:opacity-80 transition-opacity" />
        <div className="w-3 h-3 rounded-full bg-yellow-500 hover:opacity-80 transition-opacity" />
        <div className="w-3 h-3 rounded-full bg-green-500 hover:opacity-80 transition-opacity" />
      </div>
      <div className="flex items-center gap-2">
        {technologies.length > 1 && (
          <div className="relative">
            <motion.div>
              <Button
                variant="link"
                onClick={() => setActiveTech(technologies[0].id)}
                className="flex items-center justify-between px-0"
              >
                <div className="flex items-center">
                  {technologies.find(t => t.id === activeTech)?.icon}
                  <span className="ml-2">
                    {technologies.find(t => t.id === activeTech)?.name}
                  </span>
                </div>
              </Button>
            </motion.div>
          </div>
        )}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleCopy}
          className="p-2 hover:bg-muted rounded-md transition-colors duration-200"
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 17,
          }}
        >
          <AnimatePresence mode="wait">
            {copied ? (
              <motion.div
                key="copied"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center"
              >
                <Check className="h-4 w-4 text-green-500" />
              </motion.div>
            ) : (
              <motion.div
                key="copy"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center"
              >
                <Copy className="h-4 w-4" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  );
};
CodeBlockHeader.displayName = "CodeBlockHeader";

interface CodeBlockContentProps extends React.HTMLAttributes<HTMLDivElement> {
  code: string;
  language?: string;
  showCopiedOverlay?: boolean;
}
const CodeBlockContent = ({
  className,
  code,
  language = "shell",
  showCopiedOverlay = false,
  ...props
}: CodeBlockContentProps) => {
    const hljsLanguages = {
      shell: "bash",
      bash: "bash",
      typescript: "typescript"
    }

    const hljsLanguage = hljsLanguages[language as keyof typeof hljsLanguages] || "bash";

    return (
      <div
        className={cn("relative w-full bg-muted/20", className)}
        {...props}
      >
        <pre className="p-4 w-full font-mono text-sm leading-relaxed tracking-tight">
          <code
            key={`${code}-${hljsLanguage}`}
            className="text-xs font-mono block hljs"
            dangerouslySetInnerHTML={{
              __html: hljs.highlight(code, {
                language: hljsLanguage
              }).value
            }}
          />

          {showCopiedOverlay && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className={cn(
                "absolute inset-0",
                "bg-green-950"
              )}
            />
          )}
        </pre>
      </div>
    );
};
CodeBlockContent.displayName = "CodeBlockContent";

const ConnectedCodeBlockContent = React.forwardRef<
  HTMLDivElement,
  Omit<React.HTMLAttributes<HTMLDivElement>, "code"> & {
    language?: string;
  }
>(({ className, language = "shell", ...props }, ref) => {
  const { activeTech, copied, technologies } = useCodeBlock();

  const activeTechnology = technologies.find((t) => t.id === activeTech);
  const activeCode = activeTechnology?.code || "";
  const activeLanguage = activeTechnology?.language || language;

  return (
    <CodeBlockContent
      code={activeCode}
      language={activeLanguage}
      showCopiedOverlay={copied}
      className={className}
      {...props}
    />
  );
});
ConnectedCodeBlockContent.displayName = "ConnectedCodeBlockContent";

export {
  CodeBlock,
  CodeBlockContent,
  CodeBlockHeader,
  ConnectedCodeBlockContent
};
