import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const title = "Announcing Igniter.js MCP Server: Native AI Integration for Modern Development";
  const description = "Igniter.js now comes with a built-in MCP Server that seamlessly integrates with Cursor, Claude Code, and other AI tools, plus specialized training for Code Agents.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: "https://igniterjs.com/blog/announcements/announcing-igniter-mcp-server",
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
