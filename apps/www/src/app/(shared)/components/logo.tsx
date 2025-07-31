"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { FlameIcon } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";

const logoVariants = {
  hidden: { scale: 0.7, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
  hover: {
    scale: 1.15,
    rotate: 5,
    transition: {
      duration: 0.5,
      ease: "easeInOut",
    },
  },
  tap: {
    scale: 0.9,
  },
};

export function Logo({
  className,
  size = "default",
}: {
  className?: string;
  size?: "small" | "default" | "large";
}) {
  const { theme } = useTheme();


  const sizes = {
    small: {
      container: "w-10 h-10",
      text: "text-md",
      subtext: "text-xs",
      gap: "gap-0",
      logo: {
        padding: "p-0",
        strokeWidth: "stroke-[1.5]",
      },
    },
    default: {
      container: "w-16 h-16",
      text: "text-md",
      subtext: "text-xs",
      gap: "gap-0",
      logo: {
        padding: "p-2",
        strokeWidth: "stroke-[1.75]",
      },
    },
    large: {
      container: "w-24 h-24",
      text: "text-xl",
      subtext: "text-xs",
      gap: "gap-0",
      logo: {
        padding: "p-1.5",
        strokeWidth: "stroke-[2]",
      },
    },
  };

  const currentSize = sizes[size];

  return (
    <Link
      href="/"
      className={cn(`flex items-center group`, className)}
      suppressContentEditableWarning
      suppressHydrationWarning
    >
      <motion.div
        className={cn("relative flex items-center mr-1")}
        initial="hidden"
        animate="visible"
        whileTap="tap"
        variants={logoVariants}
      >
        <img className="h-6 dark:invert-0 invert" src="/igniter-js/logo-light.svg" />
      </motion.div>
    </Link>
  );
}
