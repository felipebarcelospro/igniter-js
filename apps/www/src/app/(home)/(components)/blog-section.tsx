import Link from "next/link";
import { source } from "@/app/blog/source";
import { BlogGrid } from "./blog-grid";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export async function BlogSection() {
  const pages = source.getPages();
  
  // Get only the latest 3 posts
  const serializedPosts = pages.slice(0, 3).map((page) => ({
    slug: page.slugs.join('/'),
    title: page.data.title,
    description: page.data.description || '',
    tags: page.data.tags || [],
    cover: page.data.cover,
    url: page.url,
  }));

  return (
    <section className="">
      <div className="container max-w-5xl">
        <div className="border-x border-border p-4 sm:p-6">
          {/* Header */}
          <div className="flex flex-row items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-sm tracking-tight">Latest from the Blog</h2>
            </div>
            <Button asChild variant="ghost" className="gap-2 text-sm">
              <Link href="/blog">
                View All Posts
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {/* Posts Grid */}
          <BlogGrid posts={serializedPosts} />
        </div>
      </div>
    </section>
  );
}