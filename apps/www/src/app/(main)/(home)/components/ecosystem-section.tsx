"use client";

import { motion } from "framer-motion";
import { Package, Rocket, Star } from "lucide-react";
import Link from "next/link";

const packages = [
  {
    name: "Igniter Core",
    description: "The heart of the framework with type-safe APIs and context management",
    icon: (
      <svg className="w-12 h-12" viewBox="0 0 50 50" fill="none">
        <rect width="50" height="50" rx="8" fill="#111"/>
        <path d="M25 10L35 20L25 30L15 20L25 10Z" fill="white"/>
        <path d="M25 20L35 30L25 40L15 30L25 20Z" fill="white" fillOpacity="0.7"/>
      </svg>
    ),
    link: "https://github.com/felipebarcelospro/igniter-js/tree/main/packages/core"
  },
  {
    name: "Igniter CLI",
    description: "Powerful scaffolding and development tools for rapid project setup",
    icon: (
      <svg className="w-12 h-12" viewBox="0 0 50 50" fill="none">
        <rect width="50" height="50" rx="8" fill="#111"/>
        <path d="M15 20L25 15L35 20L25 25L15 20Z" fill="white"/>
        <path d="M15 25L25 20L35 25L25 30L15 25Z" fill="white" fillOpacity="0.8"/>
        <path d="M15 30L25 25L35 30L25 35L15 30Z" fill="white" fillOpacity="0.6"/>
      </svg>
    ),
    link: "https://github.com/felipebarcelospro/igniter-js/tree/main/packages/cli"
  },
  {
    name: "Igniter Queues",
    description: "Background job processing with BullMQ integration",
    icon: (
      <svg className="w-12 h-12" viewBox="0 0 50 50" fill="none">
        <rect width="50" height="50" rx="8" fill="#111"/>
        <circle cx="25" cy="15" r="3" fill="white"/>
        <circle cx="25" cy="25" r="3" fill="white" fillOpacity="0.8"/>
        <circle cx="25" cy="35" r="3" fill="white" fillOpacity="0.6"/>
        <path d="M25 18V22M25 28V32" stroke="white" strokeWidth="2" strokeOpacity="0.7"/>
      </svg>
    ),
    link: "#"
  },
  {
    name: "Igniter Store",
    description: "Redis-powered caching, sessions, and pub/sub messaging",
    icon: (
      <svg className="w-12 h-12" viewBox="0 0 50 50" fill="none">
        <rect width="50" height="50" rx="8" fill="#111"/>
        <rect x="15" y="15" width="20" height="20" rx="2" fill="white"/>
        <rect x="18" y="18" width="14" height="2" fill="#DC2626"/>
        <rect x="18" y="22" width="10" height="2" fill="#DC2626"/>
        <rect x="18" y="26" width="14" height="2" fill="#DC2626"/>
        <rect x="18" y="30" width="8" height="2" fill="#DC2626"/>
      </svg>
    ),
    link: "#"
  },
  {
    name: "Igniter Realtime",
    description: "Real-time updates and live data synchronization",
    icon: (
      <svg className="w-12 h-12" viewBox="0 0 50 50" fill="none">
        <rect width="50" height="50" rx="8" fill="#111"/>
        <circle cx="25" cy="25" r="8" stroke="white" strokeWidth="2" fill="none"/>
        <circle cx="25" cy="25" r="3" fill="white"/>
        <path d="M25 17V13M33 25H37M25 33V37M17 25H13" stroke="white" strokeWidth="2"/>
      </svg>
    ),
    link: "#"
  },
  {
    name: "Telemetry",
    description: "Application monitoring and performance insights",
    icon: (
      <svg className="w-12 h-12" viewBox="0 0 50 50" fill="none">
        <rect width="50" height="50" rx="8" fill="#111"/>
        <path d="M15 30L20 25L25 28L30 20L35 25" stroke="white" strokeWidth="2" fill="none"/>
        <circle cx="20" cy="25" r="2" fill="white"/>
        <circle cx="25" cy="28" r="2" fill="white"/>
        <circle cx="30" cy="20" r="2" fill="white"/>
      </svg>
    ),
    link: "#"
  }
];

const starterKits = [
  {
    name: "Next.js Starter",
    description: "Full-stack Next.js application with Igniter.js backend",
    icon: (
      <svg className="w-12 h-12" viewBox="0 0 50 50" fill="none">
        <rect width="50" height="50" rx="8" fill="#000000"/>
        <path d="M20 15h15v20L20 35V15z" fill="white"/>
        <path d="M15 20h10v15L15 35V20z" fill="white" fillOpacity="0.8"/>
      </svg>
    ),
    link: "#"
  },
  {
    name: "TanStack Start",
    description: "Modern React application with TanStack Router",
    icon: (
      <svg className="w-12 h-12" viewBox="0 0 50 50" fill="none">
        <rect width="50" height="50" rx="8" fill="#FF6154"/>
        <path d="M15 20L25 10L35 20L25 30L15 20Z" fill="white"/>
        <path d="M20 30L30 20L40 30L30 40L20 30Z" fill="white" fillOpacity="0.8"/>
      </svg>
    ),
    link: "#"
  },
  {
    name: "Express REST API",
    description: "Traditional Express.js REST API with Igniter.js",
    icon: (
      <svg className="w-12 h-12" viewBox="0 0 50 50" fill="none">
        <rect width="50" height="50" rx="8" fill="#000000"/>
        <path d="M10 20h30v2H10v-2zm0 6h30v2H10v-2zm0 6h20v2H10v-2z" fill="white"/>
        <circle cx="35" cy="30" r="3" fill="white"/>
      </svg>
    ),
    link: "#"
  },
  {
    name: "Bun REST API",
    description: "High-performance REST API built with Bun runtime",
    icon: (
      <svg className="w-12 h-12" viewBox="0 0 50 50" fill="none">
        <rect width="50" height="50" rx="8" fill="#FBF0DF"/>
        <circle cx="25" cy="25" r="12" fill="#F472B6"/>
        <circle cx="22" cy="22" r="2" fill="white"/>
        <circle cx="28" cy="22" r="2" fill="white"/>
        <path d="M20 28c2 3 8 3 10 0" stroke="white" strokeWidth="2" fill="none"/>
      </svg>
    ),
    link: "#"
  },
  {
    name: "Bun React App",
    description: "React application optimized for Bun runtime",
    icon: (
      <svg className="w-12 h-12" viewBox="0 0 50 50" fill="none">
        <rect width="50" height="50" rx="8" fill="#61DAFB"/>
        <circle cx="25" cy="25" r="3" fill="white"/>
        <ellipse cx="25" cy="25" rx="12" ry="5" stroke="white" strokeWidth="2" fill="none"/>
        <ellipse cx="25" cy="25" rx="12" ry="5" stroke="white" strokeWidth="2" fill="none" transform="rotate(60 25 25)"/>
        <ellipse cx="25" cy="25" rx="12" ry="5" stroke="white" strokeWidth="2" fill="none" transform="rotate(-60 25 25)"/>
      </svg>
    ),
    link: "#"
  },
  {
    name: "Deno REST API",
    description: "Secure REST API built with Deno runtime",
    icon: (
      <svg className="w-12 h-12" viewBox="0 0 50 50" fill="none">
        <rect width="50" height="50" rx="8" fill="#000000"/>
        <circle cx="25" cy="25" r="12" fill="white"/>
        <circle cx="22" cy="22" r="2" fill="black"/>
        <circle cx="28" cy="22" r="2" fill="black"/>
        <path d="M20 28c2 3 8 3 10 0" stroke="black" strokeWidth="2" fill="none"/>
        <path d="M15 15l5 5M35 15l-5 5M15 35l5-5M35 35l-5-5" stroke="white" strokeWidth="2"/>
      </svg>
    ),
    link: "#"
  }
];

const products = [
  {
    name: "SaaS Boilerplate",
    description: "Complete SaaS starter with authentication, billing, and more",
    status: "available",
    link: "#"
  },
  {
    name: "Igniter Studio",
    description: "Visual development environment for Igniter.js applications",
    status: "coming-soon",
    link: "#"
  },
  {
    name: "GetFeed",
    description: "Real-time feed and notification system",
    status: "coming-soon",
    link: "#"
  }
];

const tabs = [
  { id: "packages", label: "Packages", icon: Package },
  { id: "starter-kits", label: "Starter Kits", icon: Rocket },
  { id: "products", label: "Products", icon: Star }
];

export function EcosystemSection() {
  const [activeTab, setActiveTab] = React.useState("packages");

  const renderContent = () => {
    switch (activeTab) {
      case "packages":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {packages.map((pkg) => (
              <div key={pkg.name} className="group">
                <Link
                  href={pkg.link}
                  className="block p-10 rounded hover:bg-muted/50 transition-colors border border-border"
                >
                  <div className="flex items-start space-x-3 mb-3">
                    <div className="relative">
                      {pkg.icon}
                      <div className="absolute inset-0 rounded-lg opacity-20 blur-sm" style={{backgroundColor: pkg.icon.props.children[0].props.fill}}></div>
                    </div>
                  </div>
                  <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors mb-1">
                    {pkg.name}
                  </h3>
                  <p className="text-muted-foreground max-w-xs">
                    {pkg.description}
                  </p>
                </Link>
              </div>
            ))}
          </div>
        );
      case "starter-kits":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {starterKits.map((kit) => (
              <div key={kit.name} className="group">
                <Link
                  href={kit.link}
                  className="block p-4 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-2">
                    {kit.icon}
                    <h3 className="font-semibold">{kit.name}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {kit.description}
                  </p>
                </Link>
              </div>
            ))}
          </div>
        );
      case "products":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => (
              <div key={product.name} className="group">
                <Link
                  href={product.link}
                  className={`block p-4 rounded-lg transition-colors ${
                    product.status === "available"
                      ? "hover:bg-muted/50" 
                      : "opacity-75 cursor-not-allowed"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className={`text-sm font-medium transition-colors mb-1 ${
                        product.status === "available"
                          ? "text-foreground group-hover:text-primary"
                          : "text-muted-foreground"
                      }`}>
                        {product.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {product.description}
                      </p>
                    </div>
                    {product.status === "coming-soon" && (
                      <span className="ml-2 px-2 py-1 text-xs bg-muted text-muted-foreground rounded-full">
                        Soon
                      </span>
                    )}
                  </div>
                </Link>
              </div>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <section className="border-t border-border">
      <div className="container max-w-screen-2xl">
        <div className="border-x border-border p-10">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              <span className="text-3xl text-[#1AFB6F] pr-2">/</span>
              Ecosystem
            </h2>
            <p className="text-muted-foreground">
              Our first-party packages offer operational solutions for the common problems needed to run modern applications.
            </p>
          </div>

          {/* Tabs */}
          <div className="mb-6">
            <div className="flex space-x-6 border-b border-border">
              {tabs.map((tab) => {
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`pb-2 text-sm font-medium transition-colors border-b-2 ${
                      activeTab === tab.id
                        ? "text-foreground border-foreground"
                        : "text-muted-foreground border-transparent hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div>
            {renderContent()}
          </div>
        </div>
      </div>
    </section>
  );
}

// Add React import
import React from "react";