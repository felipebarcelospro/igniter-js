import { DocsLayout } from "./components/docs-layout";
import { menu } from "./menu";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DocsLayout sections={menu}>{children}</DocsLayout>;
}
