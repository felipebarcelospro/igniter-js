"use client";

import { CTASection } from "@/app/(shared)/components/cta";
import { TableOfContents } from "@/app/(shared)/components/toc";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { Search } from "./search";
import { Sidebar } from "./sidebar";

interface DocsLayoutProps {
  children: React.ReactNode;
  sections: any[]; // Ajuste o tipo conforme necessário
}
export function DocsLayout({ children, sections }: DocsLayoutProps) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      className="container max-w-screen-2xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:px-10  lg:gap-10 border-x border-border">
        {/* Sidebar - Hidden on mobile, shown on large screens */}
        <motion.div
          className="hidden lg:block lg:col-span-3 xl:col-span-2 relative pt-10"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Search sections={sections} className="mb-8" />
          <Sidebar sections={sections} />
        </motion.div>

        {/* Main content */}
        <motion.main
          key={pathname}
          className="col-span-1 lg:col-span-6 xl:col-span-7 lg:border-l border-border"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {/* Mobile search - only shown on mobile */}
          <div className="lg:hidden border-b">
            <Search sections={sections} className="" />
          </div>

          <div className="markdown-content p-4 lg:pt-8 lg:pl-10">{children}</div>
        </motion.main>

        {/* Table of Contents - Hidden on mobile and tablet, shown on large screens */}
        <motion.div
          key={pathname}
          className="hidden xl:block xl:col-span-3 pl-10 pb-20"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <TableOfContents />
        </motion.div>
      </div>

      {/* Mobile sidebar - Add a floating action button for mobile navigation */}
      <div className="lg:hidden fixed bottom-6 right-6 z-50">
        {/* This could be expanded to show a mobile sidebar drawer */}
      </div>
    </motion.div>
  );
}
