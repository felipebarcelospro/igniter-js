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
    <div className="px-4 lg:px-8 py-8 lg:py-16">
      <section>
        <div className="container mx-auto max-w-screen-2xl">
          {/* Header Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Blog
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Stay updated with the latest news, tutorials, and insights about Igniter.js. Learn best practices, discover new features, and get tips from the community.
            </p>
          </div>
          
          <div className="border border-border rounded-lg overflow-hidden">
            <BlogList posts={segments} />
          </div>
        </div>
      </section>
      
      <div className="mt-16">
        <CTASection />
      </div>
    </div>
  );
}
