"use client";

import { Logo } from "@/app/(shared)/components/logo";
import { motion } from "framer-motion";

export function HeroSection() {
  return (
    <motion.section
      className="text-center py-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <motion.div
        className="mb-8 flex justify-center"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <Logo size="large" />
      </motion.div>

      <motion.h1
        className="text-4xl md:text-6xl font-bold mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        Drift KV
      </motion.h1>

      <motion.p
        className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        A powerful, type-safe ORM designed for Deno KV and modern TypeScript
        environments
      </motion.p>
    </motion.section>
  );
}
