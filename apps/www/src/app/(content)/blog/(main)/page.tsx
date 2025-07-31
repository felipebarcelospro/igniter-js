import { CTASection } from "@/app/(shared)/components/cta";
import { FileSystemContentManager } from "@/lib/docs";
import { generateMetadata } from "@/lib/metadata";
import { BlogList } from "./components/blog-list";

export const metadata = generateMetadata({
  title: "Blog",
  description: "Stay updated with the latest news, tutorials, and insights about Igniter.js. Learn best practices, discover new features, and get tips from the community.",
  canonical: "/blog",
  keywords: ["Igniter.js blog", "TypeScript tutorials", "Framework updates", "Web development", "API development", "Best practices"]
});

export default async function Page() {
  const segments = await FileSystemContentManager.getNavigationItems("blog");

  return (
    <div className="px-8 py-16">
      <section>
        <div className="container mx-auto max-w-screen-2xl">
          <div className="border border-border">
            <BlogList posts={segments} />
          </div>
        </div>
      </section>
      <CTASection />
    </div>
  );
}
