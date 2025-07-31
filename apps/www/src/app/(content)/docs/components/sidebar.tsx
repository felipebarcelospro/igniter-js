import { ContentSection } from "@/lib/docs";
import { Suspense } from "react";
import { SidebarClient } from "./sidebar-client";

export function Sidebar({ sections }: { sections: ContentSection[] }) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SidebarClient sidebarItems={sections} />
    </Suspense>
  );
}
