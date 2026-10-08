"use client";

import { config } from "@/configs/application";
import { motion } from "framer-motion";

export function FeaturesSection() {
  return (
    <motion.section
      id="features"
      variants={{
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
      }}
    >
      <motion.div
        className="container max-w-5xl"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.1,
            },
          },
        }}
      >
        <div className="border-x border-border px-4 pb-2 pt-6 lg:px-6">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Designed for developers and AI coding agents
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Typed APIs, focused packages, and consistent project guidance.
          </p>
        </div>
        <div className="grid grid-cols-1 border-x border-border sm:grid-cols-2 lg:grid-cols-4">
          {config.features.map((feature, index) => (
            <motion.div
              key={index}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="px-4 py-6 lg:px-6">
                <span className="mr-2">{feature.icon}</span>

                <div className="mb-4 min-h-5 sm:mb-6">
                  <h3
                    className="min-h-5 text-sm font-semibold leading-5"
                    style={{
                      display: "-webkit-box",
                      WebkitBoxOrient: "vertical",
                      WebkitLineClamp: 1,
                      overflow: "hidden",
                    }}
                  >
                    {feature.title}
                  </h3>
                </div>
                <p
                  className="min-h-24 text-base leading-6 text-muted-foreground"
                  style={{
                    display: "-webkit-box",
                    WebkitBoxOrient: "vertical",
                    WebkitLineClamp: 4,
                    overflow: "hidden",
                  }}
                >
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.section>
  );
}
