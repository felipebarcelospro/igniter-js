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
    <div className="relative isolate overflow-hidden">
      {/* Header with background elements */}
      <div className="border-b border-border">
        <div className="container mx-auto max-w-screen-2xl">
          <div className='border-x border-border py-24 px-10'>
            <h2 className="text-2xl font-semibold text-foreground mb-6">
              <span className="text-3xl text-muted pr-2">/</span>
              Blog
            </h2>
            <p className="text-muted-foreground max-w-md">
              Stay updated with the latest news, tutorials, and insights about Igniter.js. Learn best practices, discover new features, and get tips from the community.
            </p>
          </div>
        </div>
      </div>

      {/* Main content with sidebar */}
      <div className="container mx-auto max-w-screen-2xl border-b border-border">
        <div className='border-x border-border'>
          <BlogList posts={segments} />
        </div>
      </div>

      <div>
        <CTASection />
      </div>
    </div>
  );
}
