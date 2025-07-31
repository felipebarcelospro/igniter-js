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
      <div className="grid grid-cols-1 md:grid-cols-12 divide-x divide-border gap-10 border-x px-10 border-border">
        <motion.div
          className="col-span-3 relative pt-10"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Search sections={sections} className="mb-8" />
          <Sidebar sections={sections} />
        </motion.div>

        <motion.main
          key={pathname}
          className="col-span-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >          
          <div className="markdown-content pt-8 pl-10">{children}</div>
        </motion.main>

        <motion.div
          key={pathname}
          className="col-span-3 pl-10 pb-20 hidden md:block"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <TableOfContents />
        </motion.div>
      </div>
    </motion.div>
  );
}
