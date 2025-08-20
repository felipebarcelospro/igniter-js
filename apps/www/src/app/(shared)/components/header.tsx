"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { ThemeToggle } from "@/components/theme-toggle";
import { config } from "@/configs/application";
import { RepositoryInfo } from "@/lib/github";
import { motion, useScroll, useTransform } from "framer-motion";
import { Menu, Star } from "lucide-react";
import { Logo } from "./logo";

const StarCount = ({ stars }: { stars: number }) => {
  return (
    <Link href={config.githubUrl} className="flex items-center px-4 h-12 hover:bg-secondary/30" target="_blank" rel="noopener noreferrer">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        whileHover={{
          scale: 1.00,
          transition: { duration: 0.2 },
        }}
        whileTap={{ scale: 0.95 }}
        className="hidden sm:flex items-center space-x-2 cursor-pointer"
      >
        <motion.div
          initial={{ rotate: -180 }}
          animate={{ rotate: 0 }}
          transition={{ duration: 0.5 }}
          whileHover={{ rotate: 180 }}
        >
          <Star fill='currentColor' className="w-4 h-4" />
        </motion.div>
        <motion.span
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-sm font-medium text-foreground dark:text-foreground"
        >
          {stars ? stars.toLocaleString() : "0"}
        </motion.span>
      </motion.div>
    </Link>
  );
};

const NavLink = ({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) => (
  <motion.div
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    whileHover={{
      transition: { duration: 0.2 },
    }}
    whileTap={{ scale: 0.95 }}
  >
    <Link
      href={href}
      className="flex items-center px-4 h-12 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-all"
    >
      {children}
    </Link>
  </motion.div>
);

const SocialButton = ({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) => (
  <motion.div className="flex items-center px-4 h-12 hover:bg-secondary/30" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
    <a href={href} target="_blank" rel="noopener noreferrer">
      {icon}
      <span className="sr-only">{label}</span>
    </a>
  </motion.div>
);

const MobileNavItem = ({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) => (
  <motion.li whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
    <Link
      href={href}
      className="flex items-center p-2 rounded-lg hover:bg-secondary transition-colors"
    >
      <span className="mr-3 h-5 w-5">{icon}</span>
      <span className="text-lg">{label}</span>
    </Link>
  </motion.li>
);

const DesktopNav = ({
  lastUpdateDate,
  stars,
}: {
  lastUpdateDate: string;
  stars: number;
}) => (
  <motion.div
    className="hidden md:flex items-center divide-x divide-border"
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <NavLink href="/">hello_</NavLink>
    <NavLink href="/docs">docs_</NavLink>
    <NavLink href="/templates">templates_</NavLink>
    <NavLink href="/changelog">changelog_</NavLink>
    <NavLink href="/blog">blog_</NavLink>
    <NavLink href="/changelog">community_</NavLink>

    <StarCount stars={stars} />

    <SocialButton
      href={config.twitterUrl}
      icon={
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
          className="w-4 h-4"
        >
          <path d="M4 4l11.733 16h4.267l-11.733 -16z"></path>
          <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"></path>
        </svg>
      }
      label="X"
    />
    <SocialButton
      href={config.githubUrl}
      icon={
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
          className="w-4 h-4"
        >
          <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
        </svg>
      }
      label="GitHub"
    />

    <div className="flex items-center px-4 h-12">
      <ThemeToggle />
    </div>
  </motion.div>
);

const MobileNav = ({ lastUpdateDate }: { lastUpdateDate: string }) => (
  <motion.div
    className="md:hidden flex items-center gap-2"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.5 }}
  >
    <ThemeToggle />
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DrawerTrigger>
      <DrawerContent className="rounded-t-[20px] flex flex-col">
        <motion.nav
          className="flex-grow px-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <ul className="space-y-4">
            <MobileNavItem
              href="/"
              icon={
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
                >
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9,22 9,12 15,12 15,22"></polyline>
                </svg>
              }
              label="Home"
            />
            <MobileNavItem
              href="/docs"
              icon={
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
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              }
              label="Documentation"
            />
            <MobileNavItem
              href="/templates"
              icon={
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
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <rect x="7" y="7" width="3" height="3"></rect>
                  <rect x="14" y="7" width="3" height="3"></rect>
                  <rect x="7" y="14" width="3" height="3"></rect>
                  <rect x="14" y="14" width="3" height="3"></rect>
                </svg>
              }
              label="Templates"
            />
            <MobileNavItem
              href="/blog"
              icon={
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
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              }
              label="Blog"
            />
            <MobileNavItem
              href="/changelog"
              icon={
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
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              }
              label="Changelog"
            />
            <MobileNavItem
              href={config.githubUrl}
              icon={
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
                >
                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
                </svg>
              }
              label="GitHub"
            />
            <MobileNavItem
              href={config.termsOfUseUrl}
              icon={
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
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              }
              label="Terms of Use"
            />
            <MobileNavItem
              href={config.privacyPolicyUrl}
              icon={
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
                >
                  <rect
                    x="3"
                    y="11"
                    width="18"
                    height="11"
                    rx="2"
                    ry="2"
                  ></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              }
              label="Privacy Policy"
            />
          </ul>
        </motion.nav>
        <DrawerFooter className="border-t pt-4 mt-auto">
          <motion.div
            className="flex justify-center space-x-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <SocialButton
              href={config.twitterUrl}
              icon={
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
                >
                  <path d="M4 4l11.733 16h4.267l-11.733 -16z"></path>
                  <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"></path>
                </svg>
              }
              label="X"
            />
            <SocialButton
              href={config.githubUrl}
              icon={
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
                >
                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
                </svg>
              }
              label="GitHub"
            />
          </motion.div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  </motion.div>
);

export function Header({ repoInfo }: { repoInfo: RepositoryInfo }) {
  const { scrollY } = useScroll();

  const headerY = useTransform(scrollY, [0, 100], [0, -100]);
  const headerOpacity = useTransform(scrollY, [0, 100], [1, 0]);
  const floatingHeaderY = useTransform(scrollY, [0, 100], [-100, 0]);
  const floatingHeaderOpacity = useTransform(scrollY, [0, 100], [0, 1]);

  return (
    <>
      <motion.header
        className="border-b border-border"
        style={{
          y: headerY,
          opacity: headerOpacity,
        }}
      >
        <div className="container mx-auto max-w-screen-2xl">
          <nav className="flex justify-between items-center px-4 border-x border-border">
            <Logo />
            <DesktopNav
              lastUpdateDate={repoInfo.updatedAt}
              stars={repoInfo.starCount}
            />
            <MobileNav lastUpdateDate={repoInfo.updatedAt} />
          </nav>
        </div>
      </motion.header>

      <motion.header
        className="fixed top-0 left-0 right-0 z-50 bg-background/60 border-b border-border backdrop-blur-md"
        style={{
          y: floatingHeaderY,
          opacity: floatingHeaderOpacity,
        }}
      >
        <div className="container mx-auto max-w-screen-2xl">
          <nav className="flex justify-between items-center px-4 border-x border-border">
            <Logo />
            <DesktopNav
              lastUpdateDate={repoInfo.updatedAt}
              stars={repoInfo.starCount}
            />
            <MobileNav lastUpdateDate={repoInfo.updatedAt} />
          </nav>
        </div>
      </motion.header>
    </>
  );
}
