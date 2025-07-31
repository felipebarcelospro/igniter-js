"use client";

import { InstallCommand } from "@/app/(shared)/components/install-command";
import { TechBadge } from "@/app/(shared)/components/tech-badge";
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
      <div className="container max-w-screen-2xl">
        <div className="border-x border-border">
          {/* Announcement Banner */}
          <div className="border-b border-border text-sm px-4 lg:px-10 py-5 bg-secondary/20 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-0">
            <span className="text-xs sm:text-sm">Introducing Igniter.js Queues, Realtime, MCP Server and more.</span>
            <a href="/blog" className="sm:ml-auto flex items-center text-primary hover:text-primary/80 transition-colors text-xs sm:text-sm">
              Read more <ArrowUpRight className="size-3 sm:size-4 ml-1 sm:ml-2" />
            </a>
          </div>

          <div className="p-4 lg:p-10">
            <motion.h1
              className="tracking-tight text-3xl sm:text-4xl lg:text-5xl xl:text-6xl max-w-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent"
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
            >
              {config.projectTagline}
            </motion.h1>

            <motion.p
              className="text-base sm:text-lg lg:text-xl mt-4 lg:mt-6 mb-8 sm:mb-10 md:mb-12 text-muted-foreground max-w-3xl leading-relaxed"
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
            >
              {config.projectDescription}
            </motion.p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-4 mb-8 lg:mb-12">
              <Button 
                size="lg" 
                className="px-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                asChild
              >
                <a href="/docs" className="flex items-center">
                  Get Started
                  <ArrowUpRight className="size-3 ml-2"/>
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
              <p className="text-sm text-muted-foreground mb-4">Built with modern technologies</p>
              <div className="flex flex-wrap gap-2">
                <TechBadge name="TypeScript" />
                <TechBadge name="Node.js" />
                <TechBadge name="Express" />
                <TechBadge name="Prisma" />
                <TechBadge name="Redis" />
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
