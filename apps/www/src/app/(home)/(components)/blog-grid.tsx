"use client";

import Link from "next/link";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { Clock, Triangle } from "lucide-react";
import { MouseEvent as ReactMouseEvent, useState } from "react";
import { CanvasRevealEffect } from "@/components/site/canvas-reveal-effect";
import { config } from "@/configs/application";

export interface SerializedBlogPost {
  slug: string;
  title: string;
  description: string;
  tags?: string[];
  cover?: string;
  url: string;
}

interface BlogGridProps {
  posts: SerializedBlogPost[];
}

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
      type: "spring" as const,
      stiffness: 100,
    },
  },
};

function BlogPostCard({ post }: { post: SerializedBlogPost }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const [isHovering, setIsHovering] = useState(false);

  function handleMouseMove({
    currentTarget,
    clientX,
    clientY,
  }: ReactMouseEvent<HTMLDivElement>) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  const handleMouseEnter = () => setIsHovering(true);
  const handleMouseLeave = () => setIsHovering(false);

  const getIcon = (tags?: string[]) => {
    if (tags?.includes("tutorial")) {
      return <Clock className="h-8 w-8 text-foreground" />;
    }
    return <Triangle className="h-8 w-8 text-foreground" />;
  };

  return (
    <Link href={post.url}>
      <motion.div
        variants={itemVariants}
        className="group/spotlight relative p-4 bg-secondary h-full"
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
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
              containerClassName="bg-transparent absolute inset-0 pointer-events-none"
              colors={[
                [59, 130, 246],
                [139, 92, 246],
              ]}
              dotSize={3}
            />
          )}
        </motion.div>

        <div className="p-6 flex flex-col grow">
          <div className="flex justify-between items-start">
            <motion.div
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.5 }}
            >
              {getIcon(post.tags)}
            </motion.div>
          </div>

          <div className="grow mt-20 flex flex-col justify-end">
            <h2 className="text-sm font-mono leading-8 font-bold mb-2 text-foreground group-hover:text-primary transition-colors">
              {post.title}
            </h2>
          </div>

          <div className="flex items-center space-x-2 mt-auto pt-4 border-t border-border">
            <motion.img
              whileHover={{ scale: 1.1 }}
              src={config.creator.image}
              alt={config.creator.name}
              className="w-6 h-6 rounded-full"
            />
            <span className="text-xs font-mono text-muted-foreground">
              {config.creator.name}
            </span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

export function BlogGrid({ posts }: BlogGridProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={containerVariants}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border divide-x rounded-lg overflow-hidden"
    >
      {posts.map((post) => (
        <BlogPostCard key={post.slug} post={post} />
      ))}
    </motion.div>
  );
}
