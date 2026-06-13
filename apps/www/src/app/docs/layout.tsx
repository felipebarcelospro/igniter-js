import { source } from "@/app/docs/source";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import {
  BotIcon,
  BoxIcon,
  ChartBarIcon,
  ClockIcon,
  DatabaseIcon,
  LibraryIcon,
  NetworkIcon,
  ServerIcon,
  TerminalIcon,
} from "lucide-react";

export default function Layout({ children }: LayoutProps<"/docs">) {
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{
        enabled: false,
      }}
      sidebar={{
        collapsible: false,
        tabs: [
          {
            title: "Core",
            description: "Core components including builder, router, eg.",
            url: "/docs/core",
            icon: <BoxIcon className="size-3 mt-1 text-orange-500" />,
          },
          {
            title: "Store",
            description: "Redis-based adapter for caching and Pub/Sub.",
            url: "/docs/store",
            icon: <DatabaseIcon className="size-3 mt-1 text-orange-500" />,
          },
          {
            title: "Jobs",
            description: "Background job processing with Redis.",
            url: "/docs/jobs",
            icon: <ClockIcon className="size-3 mt-1 text-orange-500" />,
          },
          {
            title: "MCP Server",
            description: "Transform your Igniter.js APIs to MCP Servers.",
            url: "/docs/mcp-server",
            icon: <ServerIcon className="size-3 mt-1 text-orange-500" />,
          },
          {
            title: "Caller",
            description: "Type-safe HTTP client with retry, interceptors, and validation.",
            url: "/docs/caller",
            icon: <NetworkIcon className="size-3 mt-1 text-orange-500" />,
          },
          {
            title: "Collections",
            description: "Type-safe ORM for content with schema validation and hooks.",
            url: "/docs/collections",
            icon: <LibraryIcon className="size-3 mt-1 text-orange-500" />,
          },
          {
            title: "Bots",
            description: "Create bots easily for Telegram, Whatsapp and eg.",
            url: "/docs/bots",
            icon: <BotIcon className="size-3 mt-1 text-orange-500" />,
          },
          {
            title: "CLI",
            description: "Scaffold projects, generate features, and manage development.",
            url: "/docs/cli",
            icon: <TerminalIcon className="size-3 mt-1 text-orange-500" />,
          },
          {
            title: "Telemetry",
            description: "Centralized observability with typed events and adapter support.",
            url: "/docs/telemetry",
            icon: <ChartBarIcon className="size-3 mt-1 text-orange-500" />,
          },
        ],
      }}
      searchToggle={{
        enabled: false,
      }}
    >
      {children}
    </DocsLayout>
  );
}
