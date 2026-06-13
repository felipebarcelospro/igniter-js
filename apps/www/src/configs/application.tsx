import { Activity, Bot, Clock, Database, FileText, Globe, Grid3x3, HardDrive, Mail, MessageCircle, Plug, Server, Terminal, Wrench } from "lucide-react";
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
      title: "Type-Safe RPC",
      description:
        "End-to-end type safety from server to client. Define your API once, get fully-typed clients automatically. Built-in Dependency Injection and multi-runtime support for Next.js, Express, Bun, Hono and Deno.",
      icon: <Wrench className="size-4" />,
    },
    {
      title: "CLI & Scaffolding",
      description:
        "Start any project with `igniter init`. Interactive scaffolding, project generators, and a live development dashboard — everything you need to go from zero to deployed.",
      icon: <Terminal className="size-4" />,
    },
    {
      title: "Multi-Adapter Data Store",
      description:
        "Agnostic data layer with Redis, SQLite and in-memory adapters. Caching, Pub/Sub and atomic operations — switch adapters without changing your application code.",
      icon: <Database className="size-4" />,
    },
    {
      title: "Background Jobs",
      description:
        "Persistent job queues with scheduling, CRON, retries and concurrency control. Supports in-memory, SQLite or BullMQ storage — production-ready out of the box.",
      icon: <Clock className="size-4" />,
    },
    {
      title: "File Storage",
      description:
        "Upload, download and manage files with a unified API. Local filesystem and S3-compatible adapters — move between providers with a single config line.",
      icon: <HardDrive className="size-4" />,
    },
    {
      title: "Email Sending",
      description:
        "Send transactional emails with templates, queues and pluggable providers (SMTP, SendGrid, Resend). Adapter-agnostic — swap providers without touching your logic.",
      icon: <Mail className="size-4" />,
    },
    {
      title: "Type-Safe HTTP Client",
      description:
        "A fully-typed HTTP client for consuming external APIs. Automatic Zod validation on every response — catch integration errors at compile time, not runtime.",
      icon: <Globe className="size-4" />,
    },
    {
      title: "Structured Logger",
      description:
        "Structured logging with levels, contexts and multiple destinations (console, file, OpenTelemetry). Debug faster with request-scoped traces.",
      icon: <FileText className="size-4" />,
    },
    {
      title: "OpenTelemetry Tracing",
      description:
        "Distributed tracing, metrics and observability via OpenTelemetry. See every request across services — identify bottlenecks and debug production issues.",
      icon: <Activity className="size-4" />,
    },
    {
      title: "AI Agent Framework",
      description:
        "Production-grade, type-safe AI agent framework built on Vercel AI SDK. Fluent builder API for creating agents with custom tools (Zod), persistent memory, MCP integration, and multi-agent orchestration. Telemetry, lifecycle hooks, and prompt templates included.",
      icon: <Bot className="size-4" />,
    },
    {
      title: "Multi-Platform Bots",
      description:
        "Build bots for Telegram, WhatsApp and Discord with a single unified API. One codebase, multiple platforms — with built-in middleware and state management.",
      icon: <MessageCircle className="size-4" />,
    },
    {
      title: "Schema-Driven Collections",
      description:
        "Type-safe data collections with queries, views, watchers and real-time events. Like a lightweight embedded database with full TypeScript inference.",
      icon: <Grid3x3 className="size-4" />,
    },
    {
      title: "Connector Management",
      description:
        "Type-safe, multi-tenant connector management for third-party integrations. Define connectors with Zod schemas, actions, and OAuth 2.0 with PKCE. Multi-tenant scopes, AES-256-GCM encryption, webhook pipelines, and pluggable adapters (Prisma, mock).",
      icon: <Plug className="size-4" />,
    },
    {
      title: "MCP Server",
      description:
        "Transform any Igniter.js API into an MCP (Model Context Protocol) server instantly. Your AI agents can consume your APIs natively — zero boilerplate.",
      icon: <Server className="size-4" />,
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
