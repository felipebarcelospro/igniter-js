"use client";

import { motion } from "framer-motion";
import * as React from "react";

import { cn } from "@/lib/utils";

type Tab = {
  title: string;
  value: string;
  content?: string | React.ReactNode | any;
};

type AnimatedTabsProps = {
  tabs: Tab[];
  containerClassName?: string;
  activeTabClassName?: string;
  tabClassName?: string;
  contentClassName?: string;
};

type AnimatedTabsContextProps = {
  active: Tab;
  setActive: (tab: Tab) => void;
  tabs: Tab[];
  setTabs: (tabs: Tab[]) => void;
  hovering: boolean;
  setHovering: (hovering: boolean) => void;
} & AnimatedTabsProps;

const AnimatedTabsContext =
  React.createContext<AnimatedTabsContextProps | null>(null);

function useAnimatedTabs() {
  const context = React.useContext(AnimatedTabsContext);

  if (!context) {
    throw new Error("useAnimatedTabs must be used within a <AnimatedTabs />");
  }

  return context;
}

const AnimatedTabs = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & AnimatedTabsProps
>(
  (
    {
      className,
      tabs: propTabs,
      containerClassName,
      activeTabClassName,
      tabClassName,
      contentClassName,
      ...props
    },
    ref,
  ) => {
    const [active, setActive] = React.useState<Tab>(propTabs[0]);
    const [tabs, setTabs] = React.useState<Tab[]>(propTabs);
    const [hovering, setHovering] = React.useState(false);

    return (
      <AnimatedTabsContext.Provider
        value={{
          active,
          setActive,
          tabs,
          setTabs,
          hovering,
          setHovering,
          containerClassName,
          activeTabClassName,
          tabClassName,
          contentClassName,
        }}
      >
        <div ref={ref} className={className} {...props}>
          <AnimatedTabsList />
          <AnimatedTabsContent />
        </div>
      </AnimatedTabsContext.Provider>
    );
  },
);
AnimatedTabs.displayName = "AnimatedTabs";

const AnimatedTabsList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const {
    tabs: propTabs,
    containerClassName,
    activeTabClassName,
    tabClassName,
    active,
    setActive,
    setTabs,
    setHovering,
  } = useAnimatedTabs();

  const moveSelectedTabToTop = React.useCallback(
    (idx: number) => {
      const newTabs = [...propTabs];
      const selectedTab = newTabs.splice(idx, 1);
      newTabs.unshift(selectedTab[0]);
      setTabs(newTabs);
      setActive(newTabs[0]);
    },
    [propTabs, setTabs, setActive],
  );

  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-row items-center justify-start [perspective:1000px] relative overflow-auto sm:overflow-visible no-visible-scrollbar max-w-full w-full",
        containerClassName,
        className,
      )}
      {...props}
    >
      {propTabs.map((tab, idx) => (
        <button
          key={tab.title}
          onClick={() => moveSelectedTabToTop(idx)}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          className={cn("relative px-4 py-2 rounded-full", tabClassName)}
          style={{
            transformStyle: "preserve-3d",
          }}
        >
          {active.value === tab.value && (
            <motion.div
              layoutId="clickedbutton"
              transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
              className={cn(
                "absolute inset-0 bg-gray-200 dark:bg-zinc-800 rounded-full",
                activeTabClassName,
              )}
            />
          )}
          <span className="relative block text-black dark:text-white">
            {tab.title}
          </span>
        </button>
      ))}
    </div>
  );
});
AnimatedTabsList.displayName = "AnimatedTabsList";

const AnimatedTabsContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { tabs, hovering, contentClassName } = useAnimatedTabs();

  const isActive = React.useCallback(
    (tab: Tab) => {
      return tab.value === tabs[0].value;
    },
    [tabs],
  );

  return (
    <div ref={ref} className="relative w-full h-full" {...props}>
      {tabs.map((tab, idx) => (
        <motion.div
          key={tab.value}
          layoutId={tab.value}
          style={{
            scale: 1 - idx * 0.1,
            top: hovering ? idx * -50 : 0,
            zIndex: -idx,
            opacity: idx < 3 ? 1 - idx * 0.1 : 0,
          }}
          animate={{
            y: isActive(tab) ? [0, 40, 0] : 0,
          }}
          className={cn(
            "w-full h-full absolute top-0 left-0",
            contentClassName,
            className,
          )}
        >
          {tab.content}
        </motion.div>
      ))}
    </div>
  );
});
AnimatedTabsContent.displayName = "AnimatedTabsContent";

export { AnimatedTabs };
