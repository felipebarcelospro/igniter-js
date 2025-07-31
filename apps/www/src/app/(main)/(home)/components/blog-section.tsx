import { FileSystemContentManager } from "@/lib/docs";
import { BlogList } from "@/app/(content)/blog/(main)/components/blog-list";

export async function BlogSection() {
  const segments = await FileSystemContentManager.getNavigationItems("blog");

  return (
    <section className="border-t border-border">
      <div className="container max-w-screen-2xl">
        <div className="border-x border-border">
          <BlogList posts={segments} />
        </div>
      </div>
    </section>
  );
}