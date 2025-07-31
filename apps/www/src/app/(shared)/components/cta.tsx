"use client";

import { CanvasRevealEffect } from "@/app/(content)/blog/(main)/components/canvas-reveal-effect";
import { Button } from "@/components/ui/button";
import { config } from "@/configs/application";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import Link from "next/link";
import { useState } from "react";

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
      <div className="container max-w-screen-2xl">
        <motion.div
          className="group/spotlight relative border-x border-border border-b py-24 shadow-[inset_10px_-50px_94px_0_rgb(199,199,199,0.05)] backdrop-blur"
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
              <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <svg viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" className="size-4">
                  <g fill="currentColor">
                    <polyline fill="none" points="5.25 12.5 1.75 9 5.25 5.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"></polyline>
                    <polyline fill="none" points="12.75 12.5 16.25 9 12.75 5.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"></polyline>
                    <line fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" x1="7.5" x2="10.5" y1="15.25" y2="2.75"></line>
                  </g>
                </svg>
                Built for Developers
              </span>
              <h2 className="text-6xl text-foreground leading-tight">
                Build faster with a modern tech stack
              </h2>
              <p className="text-base text-muted-foreground">
                Igniter.js provides everything you need to create production-ready applications. Start building your next project in minutes.
              </p>

              <div className="flex gap-7 flex-wrap mt-3 justify-center items-center max-w-4xl">
                <span className="transform duration-300 hover:rotate-12 transition-transform" data-state="closed" data-slot="tooltip-trigger">
                  <svg className="w-10 h-10" xmlns="http://www.w3.org/2000/svg" width="1.2em" height="1.2em" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10s-4.477 10-10 10m4-14h-1.35v4H16zM9.346 9.71l6.059 7.828l1.054-.809L9.683 8H8v7.997h1.346z" />
                  </svg>
                </span>
                <span className="transform duration-300 hover:rotate-12 transition-transform" data-state="closed" data-slot="tooltip-trigger">
                  <svg className="w-10 h-10" xmlns="http://www.w3.org/2000/svg" width="1.2em" height="1.2em" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M13.464 19.83h8.922c.283 0 .562-.073.807-.21a1.6 1.6 0 0 0 .591-.574a1.53 1.53 0 0 0 .216-.783a1.53 1.53 0 0 0-.217-.782L17.792 7.414a1.6 1.6 0 0 0-.591-.573a1.65 1.65 0 0 0-.807-.21c-.283 0-.562.073-.807.21a1.6 1.6 0 0 0-.59.573L13.463 9.99L10.47 4.953a1.6 1.6 0 0 0-.591-.573a1.65 1.65 0 0 0-.807-.21c-.284 0-.562.073-.807.21a1.6 1.6 0 0 0-.591.573L.216 17.481a1.53 1.53 0 0 0-.217.782c0 .275.074.545.216.783a1.6 1.6 0 0 0 .59.574c.246.137.525.21.808.21h5.6c2.22 0 3.856-.946 4.982-2.79l2.733-4.593l1.464-2.457l4.395 7.382h-5.859Zm-6.341-2.46l-3.908-.002l5.858-9.842l2.923 4.921l-1.957 3.29c-.748 1.196-1.597 1.632-2.916 1.632c-10.07 0-18.515-3.137-20.754-7.356c-.8 2.418-.98 5.184-.98 6.954c0 0-.527 8.675 5.508 14.71a5.67 5.67 0 0 1 5.672-5.671c5.37 0 5.367 4.683 5.363 8.488v.336c0 5.773 3.527 10.719 8.543 12.805a11.6 11.6 0 0 1-1.172-5.098c0-5.508 3.23-7.555 6.988-9.938c2.989-1.894 6.309-4 8.594-8.222a15.5 15.5 0 0 0 1.875-7.41a15.6 15.6 0 0 0-.734-4.735Zm0 0" />
                  </svg>
                </span>
                <span className="transform duration-300 hover:rotate-12 transition-transform" data-state="closed" data-slot="tooltip-trigger">
                  <svg className="w-10 h-10" xmlns="http://www.w3.org/2000/svg" width="1.2em" height="1.2em" viewBox="0 0 426 512">
                    <path fill="currentColor" d="M403.508 229.23C491.235 87.7 315.378-58.105 190.392 23.555L71.528 99.337c-57.559 37.487-82.55 109.513-47.45 183.53c-87.761 133.132 83.005 289.03 213.116 205.762l118.864-75.782c64.673-42.583 79.512-116.018 47.45-183.616m-297.592-80.886l118.69-75.739c77.973-46.679 167.756 34.942 135.388 110.992c-19.225-15.274-40.65-24.665-56.923-28.894c6.186-24.57-22.335-42.796-42.174-30.106l-118.95 75.48c-29.411 20.328 1.946 62.138 31.014 44.596l45.33-28.895c101.725-57.403 198 80.425 103.38 147.975l-118.692 75.739C131.455 485.225 34.11 411.96 67.592 328.5c17.786 13.463 36.677 23.363 56.923 28.894c-4.47 28.222 24.006 41.943 42.476 30.365L285.64 312.02c29.28-21.955-2.149-61.692-30.97-44.595l-45.504 28.894c-100.56 58.77-199.076-80.42-103.25-147.975" />
                  </svg>
                </span>
                <span className="transform duration-300 hover:rotate-12 transition-transform" data-state="closed" data-slot="tooltip-trigger">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" width="1.2em" height="1.2em" viewBox="0 0 128 128">
                    <path className="fill-foreground" d="M81.504 9.465c.973 1.207 1.469 2.836 2.457 6.09l21.656 71.136a90 90 0 0 0-25.89-8.765L65.629 30.28a1.833 1.833 0 0 0-3.52.004L48.18 77.902a90.1 90.1 0 0 0-26.003 8.778l21.758-71.14c.996-3.25 1.492-4.876 2.464-6.083a8 8 0 0 1 3.243-2.398c1.433-.575 3.136-.575 6.535-.575H71.72c3.402 0 5.105 0 6.543.579a8 8 0 0 1 3.242 2.402Zm2.59 80.61c-3.57 3.054-10.696 5.136-18.903 5.136c-10.07 0-18.515-3.137-20.754-7.356c-.8 2.418-.98 5.184-.98 6.954c0 0-.527 8.675 5.508 14.71a5.67 5.67 0 0 1 5.672-5.671c5.37 0 5.367 4.683 5.363 8.488v.336c0 5.773 3.527 10.719 8.543 12.805a11.6 11.6 0 0 1-1.172-5.098c0-5.508 3.23-7.555 6.988-9.938c2.989-1.894 6.309-4 8.594-8.222a15.5 15.5 0 0 0 1.875-7.41a15.6 15.6 0 0 0-.734-4.735Zm0 0" />
                  </svg>
                </span>
                <span className="transform duration-300 hover:rotate-12 transition-transform" data-state="closed" data-slot="tooltip-trigger">
                  <svg className="w-10 h-10" xmlns="http://www.w3.org/2000/svg" width="1.2em" height="1.2em" viewBox="0 0 128 128">
                    <path fill="currentColor" d="M61.832 4.744c-3.205.058-6.37.395-9.45 1.07l-2.402.803c-4.806 1.603-8.813 4.005-11.216 7.21l-1.602 2.404l-12.017 20.828l.166.031c-4.785 5.823-5.007 14.07-.166 21.6c1.804 2.345 4.073 4.431 6.634 6.234l-15.445 4.982L.311 97.946s42.46 32.044 75.306 24.033l2.403-.801c5.322-1.565 9.292-4.48 11.683-8.068l.334.056l16.022-28.84c3.204-5.608 2.404-12.016-1.602-18.425a36 36 0 0 0-7.059-6.643l15.872-5.375l14.42-24.033S92.817 4.19 61.831 4.744z" />
                  </svg>
                </span>
                <span className="transform duration-300 hover:rotate-12 transition-transform" data-state="closed" data-slot="tooltip-trigger">
                  <svg xmlns="http://www.w3.org/2000/svg" width="1.2em" height="1.2em" viewBox="0 0 32 32" className="w-10 h-10">
                    <path fill="currentColor" d="M24.292 15.547a3.93 3.93 0 0 0 4.115-3.145a2.57 2.57 0 0 0-2.161-1.177c-2.272-.052-3.491 2.651-1.953 4.323zm-9.177-10.85l5.359-3.104L18.766.63l-7.391 4.281l.589.328l1.119.629l2.032-1.176zm6.046-3.39c.089.027.161.1.188.188l2.484 7.593a.285.285 0 0 1-.125.344a5.06 5.06 0 0 0-2.317 5.693a5.066 5.066 0 0 0 5.401 3.703a.3.3 0 0 1 .307.203l2.563 7.803a.3.3 0 0 1-.125.344l-7.859 4.771a.3.3 0 0 1-.131.036a.26.26 0 0 1-.203-.041l-2.765-1.797a.3.3 0 0 1-.109-.129l-5.396-12.896l-8.219 4.875c-.016.011-.037.021-.052.032a.3.3 0 0 1-.261-.021l-1.859-1.093a.283.283 0 0 1-.115-.381l7.953-15.749a.27.27 0 0 1 .135-.131L18.615.045a.29.29 0 0 1 .292-.005zm-8.322 5.1l-1.932-1.089l-7.693 15.229l1.396.823l6.631-9.015a.28.28 0 0 1 .271-.12a.29.29 0 0 1 .235.177l7.228 17.296l1.933 1.251l-8.063-24.552zm13.406 10.557c-2.256 0-3.787-2.292-2.923-4.376c.86-2.083 3.563-2.619 5.156-1.025c.595.593.928 1.396.928 2.235a3.16 3.16 0 0 1-3.161 3.167z" />
                  </svg>
                </span>
                <span className="transform duration-300 hover:rotate-12 transition-transform" data-state="closed" data-slot="tooltip-trigger">
                  <svg className="w-10 h-10" xmlns="http://www.w3.org/2000/svg" width="1.2em" height="1.2em" viewBox="0 0 100 100">
                    <mask id="a" style={{ maskType: "alpha" }} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
                      <circle cx="50" cy="50" r="50" className="fill-foreground" />
                    </mask>
                    <g mask="url(#a)">
                      <circle cx="11" cy="119" r="52" className="fill-muted-foreground stroke-foreground" strokeWidth="4" />
                      <circle cx="10" cy="125" r="52" className="fill-muted-foreground stroke-foreground" strokeWidth="4" />
                      <circle cx="9" cy="131" r="52" className="fill-muted-foreground stroke-muted-foreground" strokeWidth="4" />
                      <circle cx="88" cy="119" r="52" className="fill-muted-foreground stroke-foreground" strokeWidth="4" />
                      <path className="fill-foreground" d="M89 35h2v5h-2zM83 34l2 1-1 4h-2zM77 31l2 1-3 4-2-1zM73 27l1 1-3 4-1-2zM70 23l1 1-4 3-1-2zM68 18v2l-4 1-1-2zM68 11l1 2-5 1-1-2zM69 6v2h-5V6z" />
                      <circle cx="89" cy="125" r="52" className="fill-muted-foreground stroke-foreground" strokeWidth="4" />
                      <circle cx="90" cy="131" r="52" className="fill-muted-foreground stroke-muted-foreground" strokeWidth="4" />
                      <ellipse cx="49.5" cy="119" rx="41.5" ry="51" className="fill-muted-foreground" />
                      <path d="M34 38v-9c1 1 2 4 5 6l7 30-8 2c-1-23-2-23-4-29Z" className="fill-foreground stroke-muted-foreground" />
                      <path fillRule="evenodd" clipRule="evenodd" d="M95 123c0 31-20 57-45 57S5 154 5 123c0-27 14-50 33-56l12-2c25 0 45 26 45 58Zm-45 47c22 0 39-22 39-50S72 70 50 70s-39 22-39 50 17 50 39 50Z" className="fill-foreground" />
                      <path d="M34 29c-4-8-11-5-14-4 2 3 5 4 9 4h5Z" className="fill-foreground stroke-muted-foreground" />
                      <path d="M25 38c-1 6 0 14 2 18 5-7 7-13 7-18v-9c-5 1-7 5-9 9Z" className="fill-muted-foreground" />
                      <path d="M34 29c-1 3-5 11-5 16m5-16c-5 1-7 5-9 9-1 6 0 14 2 18 5-7 7-13 7-18v-9Z" className="stroke-muted-foreground" />
                      <path d="M44 18c-10 1-11 7-10 11l4-3c5-4 6-7 6-8Z" className="fill-foreground stroke-muted-foreground" />
                      <path d="M34 29h7l18 4c-3-6-9-14-21-7l-4 3Z" className="fill-foreground" />
                      <path d="M34 29c4-2 12-5 18-1m-18 1h7l18 4c-3-6-9-14-21-7l-4 3Z" className="stroke-muted-foreground" />
                      <path d="M32 29a1189 1189 0 0 1-16 19c0-17 7-18 13-19h5a14 14 0 0 1-2 0Z" className="fill-foreground" />
                      <path d="M34 29c-5 1-7 5-9 9l-9 10c0-17 7-18 13-19h5Zm0 0c-5 2-11 3-14 10" className="stroke-muted-foreground" />
                      <path d="M41 29c9 2 13 10 15 14a25 25 0 0 1-22-14h7Z" className="fill-foreground" />
                      <path d="M34 29c3 1 11 5 15 9m-15-9h7c9 2 13 10 15 14a25 25 0 0 1-22-14Z" className="stroke-muted-foreground" />
                      <circle cx="91.5" cy="12.5" r="18.5" className="fill-foreground stroke-muted-foreground" strokeWidth="2" />
                    </g>
                  </svg>
                </span>
              </div>

              <div className="flex justify-center gap-4 mt-8">
                <Button className="rounded-full" asChild>
                  <Link href="/docs/getting-started-with-igniter-js" className="flex items-center gap-2">
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
