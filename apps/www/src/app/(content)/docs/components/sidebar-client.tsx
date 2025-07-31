"use client";

import { Button } from "@/components/ui/button";
import { ContentSection } from "@/lib/docs";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

type SidebarClientProps = {
  sidebarItems: ContentSection[];
};

export function SidebarClient({ sidebarItems }: SidebarClientProps) {
  const pathname = usePathname();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeItemRef.current && sidebarRef.current) {
      const sidebar = sidebarRef.current;
      const activeItem = activeItemRef.current;

      const sidebarRect = sidebar.getBoundingClientRect();
      const activeItemRect = activeItem.getBoundingClientRect();

      const sidebarCenter = sidebarRect.height / 2;
      const activeItemCenter = activeItemRect.top - sidebarRect.top + activeItemRect.height / 2;

      const scrollOffset = activeItemCenter - sidebarCenter;

      sidebar.scrollTo({
        top: sidebar.scrollTop + scrollOffset,
        behavior: 'smooth'
      });
    }
  }, [pathname]);

  return (
    <div
      ref={sidebarRef}
      className="space-y-10 sticky top-24 h-[calc(100vh-10rem)] overflow-y-auto [&::-webkit-scrollbar]:hidden"
    >
      {sidebarItems.map((section, index) => (
        <motion.div
          key={`${section.title}-${index}`}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className=""
        >
          <h2
            className="mb-4 px-4 text-xs uppercase text-muted-foreground tracking-tight truncate"
            title={section.title}
          >
            {section.title}
          </h2>
          <div className="space-y-1">
            {section.items.map((item, itemIndex) => (

                <Button
                  asChild
                  variant={pathname === item.slug ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start",
                    pathname === item.slug && "bg-muted font-medium",
                  )}
                >
                  <Link
                    href={item.slug}
                    className="flex w-full h-full"
                    title={item.title}
                  >
                    {item.title}
                  </Link>
                </Button>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
