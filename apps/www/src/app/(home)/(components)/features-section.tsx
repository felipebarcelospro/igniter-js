"use client";

import { Card } from "@/components/ui/card";
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-x border-border">
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
                <div className="flex items-center mb-4 sm:mb-6">
                  <span className="mr-2">
                    {feature.icon}
                  </span>
                  <h3 className="text-sm font-semibold">
                    {feature.title}
                  </h3>
                </div>
                <p className="text-base text-muted-foreground">
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
