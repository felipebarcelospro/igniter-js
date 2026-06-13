import {
  Bot,
  Clock,
  Database,
  Layers,
  MessageCircle,
  Plug,
  Server,
  Wrench,
} from "lucide-react";
import { type Config } from "./types";

export const config: Config = {
  // General
  projectName: "Igniter.js",
  projectDescription:
    "The first AI-native TypeScript framework — architected for human-AI collaboration. Feature-sliced modules, deep TypeScript inference, and built-in training for 15+ Code Agents (Cursor, Claude Code, Copilot) create a low-entropy environment where both developers and AI work seamlessly. MCP-native APIs, AI agent orchestration, type-safe RPC, background jobs, multi-platform bots, and framework-agnostic runtime support — built for the next era of development.",
  projectTagline:
    "The AI-Native TypeScript Framework: Low-Entropy Architecture for Developers and Code Agents",

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

  // Features — 8 competitive differentiators aligned with the AI-native narrative
  features: [
    {
      title: "AI-Native Low-Entropy Architecture",
      description:
        "The first framework built for AI-assisted development. Feature-sliced, predictable, and fully typed — zero friction for developers and Code Agents alike.",
      icon: <Layers className="size-4" />,
    },
    {
      title: "MCP-Native API Server & Protocol",
      description:
        "Expose any API as an MCP server instantly. Zero boilerplate — AI agents consume your application logic natively, like any other MCP tool.",
      icon: <Server className="size-4" />,
    },
    {
      title: "AI Agent Framework & Orchestration",
      description:
        "Production-grade multi-agent orchestration with tools, memory, and telemetry. The only backend framework with AI agents baked in.",
      icon: <Bot className="size-4" />,
    },
    {
      title: "Type-Safe RPC & Transport Layer",
      description:
        "Define once, get fully-typed clients across Next.js, Express, Bun, Hono, and Deno. Pure TypeScript inference — no code generation.",
      icon: <Wrench className="size-4" />,
    },
    {
      title: "Background Jobs & CRON Scheduling",
      description:
        "Persistent queues with CRON, retries, and concurrency. Type-safe and production-ready — in-memory, SQLite, or BullMQ.",
      icon: <Clock className="size-4" />,
    },
    {
      title: "Multi-Platform Bot Framework",
      description:
        "Build once, deploy to Telegram, WhatsApp, and Discord. One codebase with built-in middleware and AI agent integration.",
      icon: <MessageCircle className="size-4" />,
    },
    {
      title: "Multi-Tenant Connector Engine",
      description:
        "Type-safe, multi-tenant integrations with OAuth, encryption, and webhooks. Built for SaaS platforms that connect to everything.",
      icon: <Plug className="size-4" />,
    },
    {
      title: "Multi-Adapter Data & Storage",
      description:
        "Unified data layer across Redis, SQLite, and in-memory. File storage for local and S3. Switch adapters without changing code.",
      icon: <Database className="size-4" />,
    },
  ],

  // FAQ
  faq: [
    {
      question: "What makes Igniter.js different from other frameworks?",
      answer:
        "Igniter.js is the first AI-native TypeScript framework. While every other framework designs for humans alone, Igniter.js optimizes for human-AI collaboration. Our feature-sliced architecture, comprehensive type inference, and predictable conventions create a low-entropy environment that both developers and Code Agents navigate effortlessly. Beyond that, we ship features no competitor offers: MCP-native APIs, built-in AI agent orchestration, multi-platform bots, and multi-tenant connector management — all type-safe, all framework-agnostic.",
    },
    {
      question: "Can I use Igniter.js with my existing framework?",
      answer:
        "Yes! Igniter.js is framework-agnostic and works with any modern runtime or framework including Next.js, Express, Hono, Bun, and more. It's built on standard Web Request and Response APIs, so it integrates seamlessly with your existing tech stack without requiring major architectural changes.",
    },
    {
      question: "How does the end-to-end type safety work?",
      answer:
        "Igniter.js leverages TypeScript's type system to provide compile-time guarantees across your entire application. When you define your API on the server, the client automatically gets fully-typed methods with IntelliSense and auto-completion. No schemas to share, no code generation — just pure TypeScript inference that AI agents can navigate as easily as humans.",
    },
    {
      question: "Is Igniter.js suitable for production applications?",
      answer:
        "Absolutely! Igniter.js is built with production workloads in mind, offering features like dependency injection, middleware support, real-time capabilities, background job processing, and comprehensive error handling. The framework is designed to scale with your application needs while maintaining the predictability that makes AI agents effective.",
    },
    {
      question: "Is Igniter.js optimized for AI Code Agents?",
      answer:
        "Yes — and that's the founding principle of the framework. Igniter.js is the only framework designed from day one for AI-assisted development. Every architectural decision — feature-sliced modules, consistent naming conventions, comprehensive TypeScript inference — reduces cognitive load for both humans and AI agents. We provide built-in training context for 15+ Code Agents (Cursor, Claude Code, Copilot, and more), so agents understand your codebase instantly. The result: fewer hallucinations, faster task completion, and a development experience where AI truly amplifies your productivity.",
    },
    {
      question: "How do I get started with Igniter.js?",
      answer:
        "Getting started is simple! Use 'npx igniter init' to create a new project, or install manually with npm/yarn. Our comprehensive documentation includes tutorials, examples, and best practices to help you get up and running quickly. You can have a working API — with AI agent support — in minutes.",
    },
  ],

  // Legal
  termsOfUseUrl: "/terms-of-use",
  privacyPolicyUrl: "/privacy-policy",
};
