import { source } from "@/lib/source";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { docsOptions } from "@/lib/docs.shared";

export default function Layout({ children }: LayoutProps<"/docs">) {
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{
        enabled: false,
      }}
      sidebar={{
        collapsible: false,
      }}
      searchToggle={{
        enabled: false,
      }}
      {...docsOptions()}
    >
      {children}
    </DocsLayout>
  );
}
