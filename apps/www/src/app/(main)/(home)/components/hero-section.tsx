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
          <div className="border-b border-border text-sm px-10 py-5 bg-secondary/20 flex">
            <span>Introducing Igniter.js Queues, Realtime, MCP Server and more.</span>
            <a href="#" className="ml-auto flex items-center">Read more <ArrowUpRight className="size-4 ml-2" /></a>
          </div>

          <div className="p-10">
            <motion.h1
              className="tracking-tight text-2xl md:text-4xl max-w-xl"
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
            >
              {config.projectTagline}
            </motion.h1>

            <motion.p
              className="text-lg mt-2 mb-8 sm:mb-10 md:mb-12 text-muted-foreground max-w-3xl"
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
            >
              {config.projectDescription}
            </motion.p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-4 mb-8">
              <Button size="lg" className="px-4 shadow-lg hover:shadow-xl transition-shadow">
                Get Started
                <ArrowUpRight className="size-4 ml-6"/>
              </Button>
              <span className="flex items-center text-muted-foreground gap-2 text-sm sm:text-base">
                or run this command in your terminal
                <ArrowDown className="w-4 h-4 animate-bounce" />
              </span>
            </div>

            <div className="w-full max-w-2xl">
              <InstallCommand />
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
