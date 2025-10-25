"use client";

import { Button } from "@/components/ui/button";
import { config } from "@/configs/application";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { CanvasRevealEffect } from "./canvas-reveal-effect";

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
    },
  },
};

export function CTASection() {
  const [isHovering, setIsHovering] = useState(false);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  return (
    <section>
      <div className="container max-w-6xl">
        <motion.div
          className="group/spotlight border-t relative border-x border-border border-b py-24 shadow-[inset_10px_-50px_94px_0_rgb(199,199,199,0.05)] backdrop-blur"
          variants={itemVariants}
          onMouseMove={({ currentTarget, clientX, clientY }) => {
            const { left, top } = currentTarget.getBoundingClientRect();
            mouseX.set(clientX - left);
            mouseY.set(clientY - top);
          }}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          <motion.div
            className="pointer-events-none absolute z-0 -inset-px rounded-md opacity-0 transition duration-300 group-hover/spotlight:opacity-100"
            style={{
              backgroundColor: "hsl(var(--muted))",
              maskImage: useMotionTemplate`
              radial-gradient(
                350px circle at ${mouseX}px ${mouseY}px,
                white,
                transparent 80%
              )
            `,
            }}
          >
            {isHovering && (
              <CanvasRevealEffect
                animationSpeed={5}
                containerClassName="bg-transparent absolute inset-0 pointer-events-none opacity-50"
                colors={[
                  [59, 130, 246],
                  [139, 92, 246],
                ]}
                dotSize={3}
              />
            )}
          </motion.div>

          <div className="relative mx-auto w-full max-w-screen-2xl px-3 lg:px-10">
            <div className="mx-auto flex max-w-lg flex-col items-center gap-6 text-center">
              <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground font-mono">
                <svg viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" className="size-4">
                  <g fill="currentColor">
                    <polyline fill="none" points="5.25 12.5 1.75 9 5.25 5.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"></polyline>
                    <polyline fill="none" points="12.75 12.5 16.25 9 12.75 5.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"></polyline>
                    <line fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" x1="7.5" x2="10.5" y1="15.25" y2="2.75"></line>
                  </g>
                </svg>
                Built for Developers
              </span>
              <h2 className="text-3xl text-foreground leading-tight font-mono">
                Build faster with a modern tech stack for <b>Developers</b> and <b>Code Agents</b>
              </h2>

              <div className="flex justify-center gap-4 mt-8">
                <Button className="rounded-full" asChild>
                  <Link href="/docs/getting-started/quick-start-guide" className="flex items-center gap-2">
                    Read the docs
                  </Link>
                </Button>
                <Button variant="ghost" className="rounded-full" asChild>
                  <a href={config.githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="size-4">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"></path>
                    </svg>
                    Star us on GitHub
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

    </section>
  );
}
