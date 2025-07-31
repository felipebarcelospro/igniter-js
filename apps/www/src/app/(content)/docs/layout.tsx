import { DocsLayout } from "./components/docs-layout";
import { menu } from "./menu";
import { generateMetadata } from "@/lib/metadata";

export const metadata = generateMetadata({
  title: "Documentation",
  description: "Complete documentation for Igniter.js - the AI-friendly, type-safe framework for modern TypeScript applications. Learn about controllers, actions, real-time features, and more.",
  canonical: "/docs",
  keywords: ["Igniter.js documentation", "TypeScript framework", "API development", "Type safety", "Real-time", "Framework agnostic"]
});

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DocsLayout sections={menu}>{children}</DocsLayout>;
}
