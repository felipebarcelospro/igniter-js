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
      className="container max-w-screen-xl lg:py-16 lg:px-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="grid grid-cols-1 xl:grid-cols-[3fr_1fr] gap-8 lg:gap-16">
        <section className="space-y-4 w-auto overflow-hidden border border-border rounded-lg p-6 lg:p-16 bg-gradient-to-br from-background to-muted/20">
          <BackButton />
          <div className="max-w-full markdown-content">{children}</div>

        </section>

        {/* Table of Contents - Hidden on mobile, shown on desktop */}
        <aside className="hidden xl:block relative">
          <div className="sticky top-24">
            <TableOfContents />
          </div>
        </aside>
      </div>

      <CTASection />
    </motion.div>
  );
}
