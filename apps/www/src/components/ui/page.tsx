"use client";

import { cn } from "@/lib/utils";
import { HTMLMotionProps, motion } from "framer-motion";
import Link from "next/link";
import * as React from "react";
import { Button } from "../ui/button";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
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

interface BackButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  href?: string;
}

const BackButton = React.forwardRef<HTMLButtonElement, BackButtonProps>(
  ({ href = "/", className, ...props }, ref) => {
    return (
      <Link href={href} passHref>
        <Button
          ref={ref}
          variant="ghost"
          size="icon"
          className={cn(
            "absolute -top-12 sm:-top-16 left-0 rounded-full bg-secondary hover:bg-secondary/80 transition-transform hover:scale-105 active:scale-95",
            className,
          )}
          {...props}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m12 19-7-7 7-7" />
            <path d="M19 12H5" />
          </svg>
          <span className="sr-only">Back</span>
        </Button>
      </Link>
    );
  },
);
BackButton.displayName = "BackButton";

interface PageTitleProps extends HTMLMotionProps<"h1"> {
  children: React.ReactNode;
}

const PageTitle = React.forwardRef<HTMLHeadingElement, PageTitleProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <motion.h1
        ref={ref}
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        className={cn(
          "text-3xl sm:text-4xl md:text-5xl font-bold mb-2 md:mb-4 leading-normal md:max-w-4xl bg-clip-text text-transparent bg-gradient-to-r from-foreground to-muted-foreground",
          className,
        )}
        {...props}
      >
        {children}
      </motion.h1>
    );
  },
);
PageTitle.displayName = "PageTitle";

interface PageDescriptionProps extends HTMLMotionProps<"p"> {
  children: React.ReactNode;
}

const PageDescription = React.forwardRef<
  HTMLParagraphElement,
  PageDescriptionProps
>(({ className, children, ...props }, ref) => {
  return (
    <motion.p
      ref={ref}
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        "text-lg sm:text-xl mb-8 sm:mb-10 md:mb-12 text-muted-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </motion.p>
  );
});
PageDescription.displayName = "PageDescription";

interface PageHeaderProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

const PageHeader = React.forwardRef<HTMLElement, PageHeaderProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        className={cn("text-left mb-6 sm:mb-8 relative", className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);
PageHeader.displayName = "PageHeader";

interface PageCoverProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
}

const PageCover = React.forwardRef<HTMLDivElement, PageCoverProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className={cn(
          "w-full h-[300px] sm:h-[400px] rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center overflow-hidden",
          className,
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  },
);
PageCover.displayName = "PageCover";

interface PageProps extends HTMLMotionProps<"main"> {
  children: React.ReactNode;
}

const Page = React.forwardRef<HTMLElement, PageProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <motion.main
        ref={ref}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className={cn("px-8 py-16 sm:py-12 md:py-16", className)}
        {...props}
      >
        {children}
      </motion.main>
    );
  },
);
Page.displayName = "Page";

interface PageContentProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
}

const PageContent = React.forwardRef<HTMLElement, PageContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref as React.LegacyRef<HTMLDivElement>}
        className={cn("flex-1", className)}
        {...props}
      >
        {children}
      </motion.div>
    );
  },
);
PageContent.displayName = "PageContent";

export {
  BackButton,
  Page,
  PageContent,
  PageCover,
  PageDescription,
  PageHeader,
  PageTitle,
};
