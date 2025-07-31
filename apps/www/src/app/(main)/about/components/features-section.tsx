"use client";

import { Card } from "@/components/ui/card";
import { config } from "@/configs/application";
import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

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

export function FeaturesSection() {
  return (
    <motion.section
      className="py-16 md:py-24"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-8"
        variants={containerVariants}
      >
        {config.features.map((feature, index) => (
          <motion.div
            key={feature.title}
            variants={itemVariants}
          >
            <Card className="p-6 sm:p-8">
              <div className="flex items-center mb-4 sm:mb-6">
                <div className="bg-primary/10 p-2 sm:p-3 rounded-full mr-3 sm:mr-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg sm:text-xl font-semibold">
                  {feature.title}
                </h3>
              </div>
              <p className="text-base sm:text-lg text-muted-foreground">
                {feature.description}
              </p>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </motion.section>
  );
}
