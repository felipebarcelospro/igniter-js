import { CTASection } from "@/app/(shared)/components/cta";
import { FileSystemContentManager } from "@/lib/docs";
import { BlogList } from "./components/blog-list";

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
