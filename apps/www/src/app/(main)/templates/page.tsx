import { generateMetadata as generateMeta } from "@/lib/metadata";
import { config } from "@/configs/application";
import { TemplatesSection } from "./components/templates-section";

export const metadata = generateMeta({
  title: "Templates - Find your perfect starting point",
  description: "Discover a curated collection of templates built with modern technologies. Find the perfect starting point for your next project.",
  canonical: "/templates",
  keywords: ["Templates", "Starter kits", "Next.js", "React", "TypeScript", "Tailwind CSS", "AI", "Blog", "Portfolio", "E-commerce"]
});

export default function TemplatesPage() {
  return (
    <div className="px-0">
      <TemplatesSection />
    </div>
  );
}