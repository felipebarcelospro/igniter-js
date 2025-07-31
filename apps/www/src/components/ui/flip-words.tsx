"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import React, { useCallback, useEffect, useState } from "react";

interface FlipWordsProps {
  words?: string[];
  interval?: number;
  children?: React.ReactNode;
  className?: string;
}

function extractFlipConfig(text: string) {
  const match = text.match(
    /\{\{\s*words:\s*\[(.*?)\],\s*interval:\s*(\d+)\s*\}\}/,
  );
  if (!match) return null;

  const words = match[1]
    .split(",")
    .map((word) => word.trim().replace(/['"]/g, ""));
  const interval = parseInt(match[2]);

  return {
    words,
    interval,
    textBefore: text.slice(0, match.index ?? 0),
    textAfter: text.slice((match.index ?? 0) + match[0].length),
  };
}

export function FlipWords({
  words,
  interval = 2000,
  children,
  className,
}: FlipWordsProps) {
  const [currentWord, setCurrentWord] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  const [config, setConfig] = useState<{
    words: string[];
    interval: number;
    textBefore: string;
    textAfter: string;
  } | null>(null);

  useEffect(() => {
    if (children && typeof children === "string") {
      const extracted = extractFlipConfig(children);
      if (extracted) {
        setConfig(extracted);
        setCurrentWord(extracted.words[0]);
      }
    } else if (words?.length) {
      setCurrentWord(words[0]);
    }
  }, [children, words]);

  const startAnimation = useCallback(() => {
    const wordsList = config?.words || words || [];
    const currentIndex = wordsList.indexOf(currentWord);
    const nextWord = wordsList[currentIndex + 1] || wordsList[0];
    setCurrentWord(nextWord);
    setIsAnimating(true);
  }, [currentWord, config?.words, words]);

  useEffect(() => {
    if (!isAnimating) {
      const timer = setTimeout(() => {
        startAnimation();
      }, config?.interval || interval);
      return () => clearTimeout(timer);
    }
  }, [isAnimating, config?.interval, interval, startAnimation]);

  const renderAnimatedWord = (word: string) => (
    <motion.span
      initial={{
        opacity: 0,
        y: 10,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        type: "spring",
        stiffness: 100,
        damping: 10,
      }}
      exit={{
        opacity: 0,
        y: -40,
        x: 40,
        filter: "blur(8px)",
        scale: 2,
        position: "absolute",
      }}
      className={cn("z-10 inline-block relative text-primary", className)}
      key={word}
    >
      {word.split(" ").map((subWord, wordIndex) => (
        <motion.span
          key={subWord + wordIndex}
          initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{
            delay: wordIndex * 0.3,
            duration: 0.3,
          }}
          className="inline-block whitespace-nowrap"
        >
          {subWord.split("").map((letter, letterIndex) => (
            <motion.span
              key={subWord + letterIndex}
              initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{
                delay: wordIndex * 0.3 + letterIndex * 0.05,
                duration: 0.2,
              }}
              className="inline-block"
            >
              {letter}
            </motion.span>
          ))}
          <span className="inline-block">&nbsp;</span>
        </motion.span>
      ))}
    </motion.span>
  );

  if (children && config) {
    return (
      <span>
        {config.textBefore}
        <AnimatePresence onExitComplete={() => setIsAnimating(false)}>
          {renderAnimatedWord(currentWord)}
        </AnimatePresence>
        {config.textAfter}
      </span>
    );
  }

  return (
    <AnimatePresence onExitComplete={() => setIsAnimating(false)}>
      {renderAnimatedWord(currentWord)}
    </AnimatePresence>
  );
}
