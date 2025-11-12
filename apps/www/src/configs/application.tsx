import { Bot, Cloud, Wifi, Wrench, Puzzle, Terminal, Layers, Zap } from "lucide-react";
import { type Config } from "./types";

export const config: Config = {
  // General
  projectName: "Igniter.js",
  projectDescription:
    "The first AI-native TypeScript framework with built-in training for 15+ Code Agents (Cursor, Claude Code, Copilot). Zero setup, advanced debugging, and low-entropy architecture. Type-safe RPC, real-time events, background jobs, and framework-agnostic design for Next.js, Bun, Hono, Express.",
  projectTagline:
    "The First AI-Native Framework: Built for Code Agents, Perfected for Developers",

  // Links
  githubUrl: "https://github.com/felipebarcelospro/igniter-js",
  twitterUrl: "https://x.com/feldbarcelospro",
  discordUrl: "https://discord.com/invite/JKGEQpjvJ6",
  purchaseUrl: "",

  // Developer Info
  creator: {
    name: "Felipe Barcelos",
    url: "https://felipebarcelos.pro",
    image: "https://avatars.githubusercontent.com/u/30063988?s=400&u=1f456436f25a6db3d808faced776c80f80d70a3a&v=4",
    role: "Creator of Igniter.js",
  },

  // Features
  features: [
    {
      title: "End-to-End Type Safety",
      description:
        "Write your API once, get fully-typed clients automatically. Pure TypeScript magic with zero config.",
      icon: <Wrench className="size-4" />,
    },
    {
      title: "Framework Agnostic",
      description:
        "Works with Next.js, Express, Hono, and Bun. Built on Web Standards for maximum compatibility.",
      icon: <Cloud className="size-4" />,
    },
    {
      title: "Real-Time & Jobs",
      description:
        "Server-Sent Events and job queues built-in. Add live updates and async processing.",
      icon: <Wifi className="size-4" />,
    },
    {
      title: "Code Agents Ready",
      description:
        "Native training for Cursor, Claude Code, Copilot, and 15+ AI assistants. Zero configuration required.",
      icon: <Bot className="size-4" />,
    },
    {
      title: "Powerful Plugin System",
      description:
        "Self-contained modules that add routes, middleware, and type-safe actions across projects.",
      icon: <Puzzle className="size-4" />,
    },
    {
      title: "CLI & Developer Tools",
      description:
        "Interactive CLI with scaffolding and live dashboard. Start instantly with 'igniter init'.",
      icon: <Terminal className="size-4" />,
    },
    {
      title: "Feature-Based",
      description:
        "Organize by business features, not layers. High cohesion, low coupling for better scalability.",
      icon: <Layers className="size-4" />,
    },
    {
      title: "Dependency Injection",
      description:
        "Type-safe DI through the Context system. Inject databases and services in a testable way.",
      icon: <Zap className="size-4" />,
    },
  ],

  // FAQ
  faq: [
    {
      question: "What makes Igniter.js different from other frameworks?",
      answer:
        "Igniter.js is designed specifically for modern TypeScript applications with a focus on end-to-end type safety, AI friendliness, and developer experience. Unlike traditional frameworks, it provides fully-typed RPC communication, works seamlessly across different runtimes, and offers built-in real-time capabilities and background jobs without complex setup.",
    },
    {
      question: "Can I use Igniter.js with my existing framework?",
      answer:
        "Yes! Igniter.js is framework-agnostic and works with any modern runtime or framework including Next.js, Express, Hono, Bun, and more. It's built on standard Web Request and Response APIs, so it integrates seamlessly with your existing tech stack without requiring major architectural changes.",
    },
    {
      question: "How does the end-to-end type safety work?",
      answer:
        "Igniter.js leverages TypeScript's type system to provide compile-time guarantees across your entire application. When you define your API on the server, the client automatically gets fully-typed methods with IntelliSense and auto-completion. No schemas to share, no code generation - just pure TypeScript magic.",
    },
    {
      question: "Is Igniter.js suitable for production applications?",
      answer:
        "Absolutely! Igniter.js is built with production workloads in mind, offering features like dependency injection, middleware support, real-time capabilities, background job processing, and comprehensive error handling. The framework is designed to scale with your application needs.",
    },
    {
      question: "What about Code Agents and developer experience?",
      answer:
        "Igniter.js is designed for the future of development where humans and AI collaborate. The predictable structure, clear conventions, feature-sliced architecture, and comprehensive type system create a low-entropy environment that both developers and AI agents can easily understand and modify.",
    },
    {
      question: "How do I get started with Igniter.js?",
      answer:
        "Getting started is simple! Use 'npx igniter init' to create a new project, or install manually with npm/yarn. Our comprehensive documentation includes tutorials, examples, and best practices to help you get up and running quickly. You can have a working API in minutes.",
    },
  ],

  // Legal
  termsOfUseUrl: "/terms-of-use",
  privacyPolicyUrl: "/privacy-policy",
};
