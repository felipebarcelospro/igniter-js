"use client";

import { config } from "@/configs/application";
import { motion } from "framer-motion";

export function DeveloperSection() {
  return (
    <motion.div
      className="flex flex-col items-center text-center max-w-screen-2xl mx-auto"
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
      }}
    >
      <motion.div
        className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden mb-4 sm:mb-6"
        whileHover={{ scale: 1.1 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <img
          src={config.creator.image}
          alt={`${config.creator.name}`}
          className="w-full h-full object-cover"
        />
      </motion.div>
      <motion.h3
        className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-3"
        variants={{
          hidden: { opacity: 0, y: 20 },
          visible: { opacity: 1, y: 0 },
        }}
      >
        {config.creator.name}
      </motion.h3>
      <motion.p
        className="text-muted-foreground text-sm sm:text-base mb-4 sm:mb-6 max-w-md text-center"
        variants={{
          hidden: { opacity: 0, y: 20 },
          visible: { opacity: 1, y: 0 },
        }}
      >
        {config.creator.role}
      </motion.p>
      <motion.div
        className="flex space-x-4"
        variants={{
          hidden: { opacity: 0, y: 20 },
          visible: { opacity: 1, y: 0 },
        }}
      >
        <motion.a
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          href={config.twitterUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-primary hover:underline text-sm"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2"
          >
            <path d="M4 4l11.733 16h4.267l-11.733 -16z"></path>
            <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"></path>
          </svg>
          Twitter
        </motion.a>
      </motion.div>
    </motion.div>
  );
}
