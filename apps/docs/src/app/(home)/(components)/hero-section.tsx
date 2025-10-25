"use client";

import { InstallCommand } from "@/components/site/install-command";
import { SupportedFrameworks } from "@/components/site/supported-frameworks";
import { TechBadge } from "@/components/site/tech-badge";
import { Button } from "@/components/ui/button";
import { config } from "@/configs/application";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUpRight } from "lucide-react";

export function HeroSection() {
  return (
    <motion.section
      className="text-left"
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
      }}
    >
      <div className="container max-w-6xl">
        <div className="py-8">
          {/* Announcement Banner */}
          <div className="w-fit mb-6 text-sm pb-2 border-b-2 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-0">
            <span className="text-xs sm:text-sm">
              Announcing Igniter.js MCP Server.
            </span>
            <a
              href="/blog/announcements/announcing-igniter-mcp-server"
              className="sm:ml-auto pl-8 flex items-center text-primary hover:text-primary/80 transition-colors text-xs sm:text-sm"
            >
              Read the announcement{" "}
              <ArrowUpRight className="size-3 sm:size-4 ml-1 sm:ml-2" />
            </a>
          </div>

          <motion.h1
            className="tracking-tight text-4xl max-w-xl font-bold mb-8 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent"
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
          >
            {config.projectTagline}
          </motion.h1>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-4 mb-8 lg:mb-12">
            <Button
              size="lg"
              className="px-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              asChild
            >
              <a href="/docs" className="flex items-center">
                Get Started
                <ArrowUpRight className="size-3 ml-2" />
              </a>
            </Button>
            <span className="flex flex-col sm:flex-row sm:items-center text-muted-foreground gap-2 text-sm sm:text-base">
              <span>or run this command in your terminal</span>
              <ArrowDown className="w-4 h-4 animate-bounce hidden sm:block" />
            </span>
          </div>

          <div className="w-full max-w-2xl">
            <InstallCommand />
          </div>

          {/* Tech Stack Badges */}
          <motion.div
            className="mt-12 lg:mt-16"
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
          >
            <p className="text-sm text-muted-foreground mb-4">
              Works with modern technologies
            </p>
            <div className="flex flex-wrap gap-2">
              <SupportedFrameworks />
            </div>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}
