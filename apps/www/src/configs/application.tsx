import {
  Bot,
  Clock,
  Code2,
  Database,
  HardDrive,
  Network,
  PanelsTopLeft,
  Plug,
} from "lucide-react";
import { type Config } from "./types";

export const config: Config = {
  // General
  projectName: "Igniter.js",
  projectDescription:
    "The first TypeScript backend framework built for AI-assisted development. Igniter.js combines typed APIs, modular backend packages, consistent conventions, and package-specific guidance for coding agents—while developers stay in control.",
  projectTagline:
    "The first TypeScript backend framework built for AI-assisted development",

  // Links
  githubUrl: "https://github.com/felipebarcelospro/igniter-js",
  twitterUrl: "https://x.com/feldbarcelospro",
  discordUrl: "https://discord.com/invite/JKGEQpjvJ6",
  purchaseUrl: "",

  // Developer Info
  creator: {
    name: "Felipe Barcelos",
    url: "https://felipebarcelos.pro",
    image:
      "https://avatars.githubusercontent.com/u/30063988?s=400&u=1f456436f25a6db3d808faced776c80f80d70a3a&v=4",
    role: "Creator of Igniter.js",
  },

  // Features — outcome-oriented pillars grounded in the Igniter.js ecosystem
  features: [
    {
      title: "Coding context",
      description:
        "Package-specific guides document APIs, patterns, and workflows for coding agents to follow.",
      icon: <Bot className="size-4" />,
    },
    {
      title: "Typed HTTP client",
      description:
        "Define typed queries and mutations, then call them with inferred request and response types.",
      icon: <Code2 className="size-4" />,
    },
    {
      title: "Framework adapters",
      description:
        "Connect Igniter routes to supported frameworks, including Next.js and Express.",
      icon: <PanelsTopLeft className="size-4" />,
    },
    {
      title: "Background jobs",
      description:
        "Define jobs with typed inputs, then process them with queue adapters, scheduling, and workers.",
      icon: <Clock className="size-4" />,
    },
    {
      title: "Store adapters",
      description:
        "Use a shared store API with supported adapters for application state and data access.",
      icon: <Database className="size-4" />,
    },
    {
      title: "Storage and collections",
      description:
        "Manage files through storage adapters and define data collections from schemas.",
      icon: <HardDrive className="size-4" />,
    },
    {
      title: "Connectors and messaging",
      description:
        "Build external service connections, messaging bots, and provider-backed email workflows.",
      icon: <Plug className="size-4" />,
    },
    {
      title: "AI agents and MCP",
      description:
        "Compose AI agents with reusable tools and expose router actions to MCP-compatible clients.",
      icon: <Network className="size-4" />,
    },
  ],

  // FAQ
  faq: [
    {
      question: "What makes Igniter.js different from other frameworks?",
      answer:
        "Igniter.js is designed for teams building TypeScript backends with AI coding agents. Consistent package patterns and agent-facing guides give coding tools project context, while typed APIs and modular packages help developers extend the backend one capability at a time.",
    },
    {
      question: "Can I use Igniter.js with my existing framework?",
      answer:
        "Core provides adapters for frameworks including Next.js and Express. See the adapter documentation for setup details and supported integrations.",
    },
    {
      question: "How does the end-to-end type safety work?",
      answer:
        "Igniter.js uses TypeScript inference across API definitions and its caller package. The exact types available depend on the API and client configuration you build.",
    },
    {
      question: "Is Igniter.js suitable for production applications?",
      answer:
        "Igniter.js provides building blocks for HTTP APIs, middleware, real-time features, and background jobs. Review the package guides to choose the adapters and deployment setup that fit your workload.",
    },
    {
      question: "Is Igniter.js optimized for AI Code Agents?",
      answer:
        "The repository includes package-specific guidance for coding agents, and the ecosystem includes agent and MCP packages. These tools support AI-assisted workflows; they do not replace developer review.",
    },
    {
      question: "How do I get started with Igniter.js?",
      answer:
        "Start with the Core quick-start guide to create a typed API, then add ecosystem packages as your application needs them.",
    },
  ],

  // Legal
  termsOfUseUrl: "/terms-of-use",
  privacyPolicyUrl: "/privacy-policy",
};
