import { Bot, Cloud, Wifi, Wrench, Puzzle, Terminal, Layers, Zap } from "lucide-react";
import { type Config } from "./types";

export const config: Config = {
  // General
  projectName: "Igniter.js",
  projectDescription:
    "Igniter is a modern, type-safe HTTP framework designed to streamline the development of scalable TypeScript applications.",
  projectTagline:
    'The Most Comprehensive End-to-End Typesafe Full-stack TypeScript Framework',

  // Links
  githubUrl: "https://github.com/felipebarcelospro/igniter-js",
  twitterUrl: "https://x.com/feldbarcelospro",
  purchaseUrl: "",

  // Developer Info
  developerName: "Felipe Barcelos",
  developerEmail: "felipebarcelospro@gmail.com",
  developerImage:
    "https://media.licdn.com/dms/image/v2/D4D03AQHvSr_V9EAOjQ/profile-displayphoto-shrink_100_100/profile-displayphoto-shrink_100_100/0/1728308774937?e=1734566400&v=beta&t=QAfLIR7Q60F1AEatAqPzGAXUjKTlhGvpFtexpyDki5U",
  developerBio:
    "I'm a passionate software engineer and entrepreneur from 🇧🇷, dedicated to creating powerful and developer-friendly tools for the modern web ecosystem.",

  // Features
  features: [
    {
      title: "End-to-End Type Safety",
      description:
        "Write your API once, get fully-typed clients for React and server communication. Pure TypeScript magic catches bugs early zero config.",
      icon: <Wrench className="size-4" />,
    },
    {
      title: "Framework Agnostic",
      description:
        "Works with any modern framework like Next.js, Express, Hono, and Bun. Built on standard Web APIs for maximum compatibility and flexibility.",
      icon: <Cloud className="size-4" />,
    },
    {
      title: "Real-Time & Jobs",
      description:
        "Built-in real-time features with Server-Sent Events and job queues. Add live updates and async processing with minimal setup.",
      icon: <Wifi className="size-4" />,
    },
    {
      title: "Code Agents Ready",
      description:
        "Built-in training for seamless integration with Claude Code, Gemini CLI, OpenCode, Grok CLI, Cursor, Windsurft and VS Code Copilot.",
      icon: <Bot className="size-4" />,
    },
    {
      title: "Powerful Plugin System",
      description:
        "Extend functionality with self-contained, reusable modules. Plugins can add routes, middleware, context, and type-safe actions across projects.",
      icon: <Puzzle className="size-4" />,
    },
    {
      title: "CLI & Developer Tools",
      description:
        "Interactive CLI with project scaffolding, live dashboard, and development tools. Get started instantly with 'igniter init'.",
      icon: <Terminal className="size-4" />,
    },
    {
      title: "Feature-Based",
      description:
        "Organize code by business features, not technical layers. High cohesion, low coupling design promotes scalability and maintainability.",
      icon: <Layers className="size-4" />,
    },
    {
      title: "Dependency Injection",
      description:
        "Clean, type-safe dependency injection through the Context system. Inject services like databases and loggers in a testable way.",
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
      question: "What about AI friendliness and developer experience?",
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
