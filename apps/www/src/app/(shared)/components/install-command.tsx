"use client";

import BunIcon from "@/components/icons/bun";
import NPMIcon from "@/components/icons/npm";
import PNPMIcon from "@/components/icons/pnpm";
import YarnIcon from "@/components/icons/yarn";
import { Button } from "@/components/ui/button";
import {
  CodeBlock,
  CodeBlockContent,
  CodeBlockHeader,
} from "@/components/ui/code-block";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";

export const INSTALL_COMMANDS = [
  {
    id: "npm",
    name: "NPM",
    icon: NPMIcon,
    code: "npx @igniter-js/cli init my-project",
    language: "bash",
  },
  {
    id: "pnpm",
    name: "PNPM",
    icon: PNPMIcon,
    code: "npx @igniter-js/cli init my-project",
    language: "bash",
  },
  {
    id: "yarn",
    name: "Yarn",
    icon: YarnIcon,
    code: "npx @igniter-js/cli init my-project",
    language: "bash",
  },
  {
    id: "bun",
    name: "Bun",
    icon: BunIcon,
    code: "bunx @igniter-js/cli init my-project",
    language: "bash",
  },
] as const;

const BUTTON_VARIANTS = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
} as const;

const CODE_BLOCK_VARIANTS = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
} as const;

export function InstallCommand() {
  const [selectedTech, setSelectedTech] =
    useState<(typeof INSTALL_COMMANDS)[number]["id"]>("npm");

  const technologies = useMemo(() => {
    const tech = INSTALL_COMMANDS.find((t) => t.id === selectedTech);
    if (!tech) return [];

    const Icon = tech.icon;
    return [
      {
        id: tech.id,
        name: tech.name,
        // @ts-ignore
        icon: <Icon className="w-4 h-4" />,
        code: tech.code,
      },
    ];
  }, [selectedTech]);

  const handleTechSelect = (techId: typeof selectedTech) => {
    setSelectedTech(techId);
  };

  const renderTechButton = (
    tech: (typeof INSTALL_COMMANDS)[number],
    index: number,
  ) => (
    <motion.div
      key={tech.id}
      variants={BUTTON_VARIANTS}
      initial="initial"
      animate="animate"
      transition={{ delay: 0.1 * index }}
    >
      <Button
        onClick={() => handleTechSelect(tech.id)}
        variant={selectedTech === tech.id ? "outline" : "ghost"}
        className="flex items-center transition-all duration-300 ease-in-out"
      >
        {/* @ts-ignore */}
        <tech.icon className="w-4 h-4 mr-2" />
        {tech.name}
      </Button>
    </motion.div>
  );

  return (
    <motion.div
      key={selectedTech}
      variants={CODE_BLOCK_VARIANTS}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 20,
      }}
    >
      <CodeBlock technologies={technologies}>
        <CodeBlockHeader>
          
        </CodeBlockHeader>
        <CodeBlockContent
          language={"typescript"}
          code={technologies[0]?.code || ""}
        />
      </CodeBlock>
    </motion.div>
  );
}
