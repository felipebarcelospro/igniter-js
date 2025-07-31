"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Link from "next/link";

export function CTASection() {
  return (
    <motion.section
      className="text-center py-16 md:py-24"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
    >
      <motion.h2
        className="text-3xl md:text-4xl font-bold mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        Ready to Get Started?
      </motion.h2>

      <motion.p
        className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        Join the growing community of developers using Drift KV to build modern,
        type-safe applications.
      </motion.p>

      <motion.div
        className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.5 }}
      >
        <motion.div
          whileHover={{
            scale: 1.05,
            transition: {
              duration: 0.2,
              ease: "easeInOut",
            },
          }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            asChild
            size="lg"
            className="min-w-[120px] bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden group"
          >
            <Link
              href="/docs/getting-started"
              className="flex items-center gap-2"
            >
              <motion.span
                initial={{ x: 0 }}
                whileHover={{ x: -4 }}
                transition={{ duration: 0.2 }}
              >
                Get Started
              </motion.span>
              <motion.svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                initial={{ x: 0, opacity: 1 }}
                whileHover={{ x: 4, opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <path
                  d="M6 12L10 8L6 4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </motion.svg>
            </Link>
          </Button>
        </motion.div>

        <motion.div
          whileHover={{
            scale: 1.05,
            transition: {
              duration: 0.2,
              ease: "easeInOut",
            },
          }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            asChild
            variant="outline"
            size="lg"
            className="min-w-[120px] border-2 hover:bg-secondary/10 shadow-md hover:shadow-lg transition-all duration-300"
          >
            <Link
              href="https://github.com/felipebarcelospro/igniter-js"
              className="flex items-center gap-2"
            >
              <motion.svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
              >
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </motion.svg>
              <motion.span
                initial={{ x: 0 }}
                whileHover={{ x: 2 }}
                transition={{ duration: 0.2 }}
              >
                View on GitHub
              </motion.span>
            </Link>
          </Button>
        </motion.div>
      </motion.div>
    </motion.section>
  );
}
