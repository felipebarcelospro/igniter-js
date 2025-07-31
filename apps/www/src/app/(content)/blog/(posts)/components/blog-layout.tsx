"use client";

import { CTASection } from "@/app/(shared)/components/cta";
import { TableOfContents } from "@/app/(shared)/components/toc";
import { BackButton } from "@/components/ui/page";
import { motion } from "framer-motion";

interface BlogLayoutProps {
  children: React.ReactNode;
}

export function BlogLayout({ children }: BlogLayoutProps) {
  return (
    <motion.div
      className="container max-w-screen-xl py-16"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="grid grid-cols-[3fr_1fr] gap-16">
        <section className="space-y-4 w-auto overflow-hidden border border-border rounded-lg p-16 bg-gradient-to-br from-background to-muted/20">
          <BackButton />
          <div className="max-w-full markdown-content">{children}</div>
          <CTASection />
        </section>
        <aside className="relative">
          <TableOfContents />
        </aside>
      </div>
    </motion.div>
  );
}
