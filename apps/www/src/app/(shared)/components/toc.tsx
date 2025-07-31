"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import hljs from "highlight.js";
import { Check, ChevronDown, Clipboard, Copy, Facebook, Linkedin, Twitter } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { INSTALL_COMMANDS } from "./install-command";

export function TableOfContents() {
  const [headings, setHeadings] = useState<HTMLHeadingElement[]>([]);
  const [activeId, setActiveId] = useState("");
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  useEffect(() => {
    const elements = Array.from(document.querySelector('.markdown-content')?.querySelectorAll("h2, h3") || []).filter(
      (element): element is HTMLHeadingElement =>
        element instanceof HTMLHeadingElement,
    );
    setHeadings(elements);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: "0% 0% -80% 0%" },
    );

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  const shareOnSocial = (platform: string) => {
    const text = "Check out this Drift KV documentation!";
    const urls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(currentUrl)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentUrl)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`
    };

    window.open(urls[platform as keyof typeof urls], '_blank');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(currentUrl);
  };

  if (headings.length === 0) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-10 sticky top-24"
    >
      <motion.section 
        className="flex flex-col gap-2"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <motion.header
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="text-sm font-semibold mb-2">Share this page</h3>
        </motion.header>
        <motion.main 
          className="flex items-center space-x-2"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1
              }
            }
          }}
          initial="hidden"
          animate="show"
        >
          {[
            { platform: 'twitter', Icon: Twitter, label: 'Share on Twitter' },
            { platform: 'linkedin', Icon: Linkedin, label: 'Share on LinkedIn' },
            { platform: 'facebook', Icon: Facebook, label: 'Share on Facebook' }
          ].map(({ platform, Icon, label }) => (
            <motion.div
              key={platform}
              variants={{
                hidden: { opacity: 0, x: -20 },
                show: { opacity: 1, x: 0 }
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button variant="secondary" className="rounded-full" size="icon" onClick={() => shareOnSocial(platform)}>
                <Icon className="size-3" />
              </Button>
            </motion.div>
          ))}
          <motion.div
            variants={{
              hidden: { opacity: 0, x: -20 },
              show: { opacity: 1, x: 0 }
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button variant="ghost" className="w-full flex justify-start" onClick={copyLink}>
              <Copy className="h-4 w-4" />
              <span className="ml-2">Copy Link</span>
            </Button>
          </motion.div>
        </motion.main>
      </motion.section>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <TOCMenu headings={headings} activeId={activeId} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        whileHover={{ scale: 1.02 }}
      >
        <motion.h3 
          className="text-lg font-semibold mb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          Try Igniter.js
        </motion.h3>
        <p className="text-sm text-muted-foreground mb-4">
          Get started with Igniter.js by installing it using your preferred package manager
        </p>
        <InstallCommandCTA />
      </motion.div>
    </motion.div>
  );
}

export function InstallCommandCTA() {
  const [isCopied, setIsCopied] = useState(false);
  const [selectedCommand, setSelectedCommand] = useState(INSTALL_COMMANDS[0]);
  const [isOpen, setIsOpen] = useState(false);

  const copyCommand = () => {
    navigator.clipboard.writeText(selectedCommand.code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.section>
        <motion.div
          className="mt-3"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="relative bg-muted border border-border rounded-md p-2"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <motion.code 
              className="text-xs font-mono block hljs"
              layoutId="command-code"
              dangerouslySetInnerHTML={{
                __html: hljs.highlight(selectedCommand.code, {
                  language: 'bash'
                }).value
              }}
            />
            
            <motion.div
              className="absolute top-2 right-1"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={copyCommand}
                className="h-6 px-2"
              >
                <AnimatePresence mode="wait">
                  {isCopied ? (
                    <motion.div
                      key="copied"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex items-center"
                    >
                      <Check className="h-3 w-3 text-green-500" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="copy"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex items-center"
                    >
                      <Clipboard className="h-3 w-3" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.section>
    </motion.div>
  );
}

export function TOCMenu({ headings, activeId }: { headings: HTMLHeadingElement[], activeId: string }) {
  const [openSection, setOpenSection] = useState<string | null>(null);

  const sections = useMemo(() => {
    const grouped: Record<string, HTMLHeadingElement[]> = {};
    let currentH2: string | null = null;

    headings.forEach(heading => {
      if (heading.tagName === 'H2') {
        currentH2 = heading.id;
        grouped[currentH2] = [heading];
      } else if (currentH2 && heading.tagName === 'H3') {
        grouped[currentH2].push(heading);
      }
    });

    return grouped;
  }, [headings]);

  useEffect(() => {
    if (activeId) {
      const activeSection = Object.keys(sections).find(sectionId => 
        sections[sectionId].some(heading => heading.id === activeId)
      );
      if (activeSection) {
        setOpenSection(activeSection);
      }
    }
  }, [activeId, sections]);

  return (
    <motion.nav 
      className="space-y-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div 
        className="flex items-center gap-2"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <p className="font-semibold text-sm">On This Page</p>
      </motion.div>
      <motion.ul 
        className="space-y-3 text-sm"
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: {
              staggerChildren: 0.1
            }
          }
        }}
        initial="hidden"
        animate="show"
      >
        {headings.map((heading, index) => {
          if (heading.tagName === 'H2') {
            const hasSubheadings = sections[heading.id]?.length > 1;
            const isActive = heading.id === activeId || sections[heading.id]?.some(h => h.id === activeId);
            const isOpen = openSection === heading.id;

            return (
              <motion.li
                key={heading.id}
                variants={{
                  hidden: { opacity: 0, x: -20 },
                  show: { opacity: 1, x: 0 }
                }}
              >
                {hasSubheadings ? (
                  <div className="space-y-2">
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => {
                        setOpenSection(isOpen ? null : heading.id);
                        document.getElementById(heading.id)?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className={cn(
                        "group flex w-full items-center justify-between py-1 text-muted-foreground transition-colors hover:text-foreground",
                        isActive && "text-foreground font-medium"
                      )}
                    >
                      <div className="flex items-center">
                        <motion.span 
                          className={cn(
                            "mr-2 h-6 w-1 rounded-full bg-muted-foreground/40 transition-colors",
                            isActive && "bg-foreground",
                            "group-hover:bg-foreground/60"
                          )}
                          animate={{ scale: isActive ? 1.1 : 1 }}
                        />
                        {heading.textContent}
                      </div>
                      <motion.div
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </motion.div>
                    </motion.button>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.ul
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="pl-4 space-y-2"
                        >
                          {sections[heading.id].slice(1).map((subheading, subIndex) => (
                            <motion.li 
                              key={subheading.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: subIndex * 0.1 }}
                            >
                              <motion.a
                                href={`#${subheading.id}`}
                                className={cn(
                                  "group flex items-center py-1 text-muted-foreground transition-colors hover:text-foreground",
                                  activeId === subheading.id && "text-foreground font-medium"
                                )}
                                whileHover={{ x: 4 }}
                              >
                                <motion.span 
                                  className={cn(
                                    "mr-2 h-1.5 w-1.5 rounded-full bg-muted-foreground/40 transition-colors",
                                    activeId === subheading.id && "bg-foreground",
                                    "group-hover:bg-foreground/60"
                                  )}
                                  animate={{ 
                                    scale: activeId === subheading.id ? 1.2 : 1
                                  }}
                                />
                                {subheading.textContent}
                              </motion.a>
                            </motion.li>
                          ))}
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <motion.a
                    href={`#${heading.id}`}
                    className={cn(
                      "group flex items-center py-1 text-muted-foreground transition-colors hover:text-foreground",
                      isActive && "text-foreground font-medium"
                    )}
                    whileHover={{ x: 4 }}
                  >
                    <motion.span 
                      className={cn(
                        "mr-2 h-6 w-2 rounded-full bg-muted-foreground/40 transition-colors",
                        isActive && "bg-foreground",
                        "group-hover:bg-foreground/60"
                      )}
                      animate={{ scale: isActive ? 1.1 : 1 }}
                    />
                    {heading.textContent}
                  </motion.a>
                )}
              </motion.li>
            );
          }
          return null;
        })}
      </motion.ul>
    </motion.nav>
  );
}
