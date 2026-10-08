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
            description: "Build typed APIs with controllers, actions, and routers.",
            url: "/docs/core",
            icon: <BoxIcon className="size-3 mt-1 text-orange-500" />,
          },
          {
            title: "App",
            description: "Compose React applications with Igniter state and triggers.",
            url: "/docs/app",
            icon: <BoxIcon className="size-3 mt-1 text-orange-500" />,
          },
          {
            title: "Caller",
            description: "Call typed Igniter APIs from clients and other services.",
            url: "/docs/caller",
            icon: <NetworkIcon className="size-3 mt-1 text-orange-500" />,
          },
          {
            title: "Store",
            description: "Use a shared key-value and event store through adapters.",
            url: "/docs/store",
            icon: <DatabaseIcon className="size-3 mt-1 text-orange-500" />,
          },
          {
            title: "Jobs",
            description: "Define typed background jobs and run them with queue adapters.",
            url: "/docs/jobs",
            icon: <ClockIcon className="size-3 mt-1 text-orange-500" />,
          },
          {
            title: "Collections",
            description: "Define schema-driven collections and typed content views.",
            url: "/docs/collections",
            icon: <LibraryIcon className="size-3 mt-1 text-orange-500" />,
          },
          {
            title: "Storage",
            description: "Store and retrieve files through provider adapters.",
            url: "/docs/storage",
            icon: <DatabaseIcon className="size-3 mt-1 text-orange-500" />,
          },
          {
            title: "Mail",
            description: "Send typed transactional email with templates and adapters.",
            url: "/docs/mail",
            icon: <LibraryIcon className="size-3 mt-1 text-orange-500" />,
          },
          {
            title: "Bots",
            description: "Build multi-platform bots with provider adapters.",
            url: "/docs/bots",
            icon: <BotIcon className="size-3 mt-1 text-orange-500" />,
          },
          {
            title: "Agents",
            description: "Compose AI agents with tools, context, and provider adapters.",
            url: "/docs/agents",
            icon: <BotIcon className="size-3 mt-1 text-orange-500" />,
          },
          {
            title: "Connectors",
            description: "Connect external services with typed, scoped integrations.",
            url: "/docs/connectors",
            icon: <NetworkIcon className="size-3 mt-1 text-orange-500" />,
          },
          {
            title: "Telemetry",
            description: "Instrument package activity with typed telemetry events.",
            url: "/docs/telemetry",
            icon: <ChartBarIcon className="size-3 mt-1 text-orange-500" />,
          },
          {
            title: "Logger",
            description: "Create structured logs and route them through transports.",
            url: "/docs/logger",
            icon: <TerminalIcon className="size-3 mt-1 text-orange-500" />,
          },
          {
            title: "Common",
            description: "Shared errors, logger interfaces, and schema contracts.",
            url: "/docs/common",
            icon: <LibraryIcon className="size-3 mt-1 text-orange-500" />,
          },
          {
            title: "MCP Server",
            description: "Run the Igniter MCP server over STDIO for coding agents.",
            url: "/docs/mcp-server-cli",
            icon: <ServerIcon className="size-3 mt-1 text-orange-500" />,
          },
          {
            title: "MCP Server Adapter",
            description: "Expose Igniter HTTP routes as tools through an MCP adapter.",
            url: "/docs/mcp-server",
            icon: <ServerIcon className="size-3 mt-1 text-orange-500" />,
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
