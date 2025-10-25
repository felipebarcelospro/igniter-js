import { BlogList } from "@/components/site/blog-list";

export async function BlogSection() {
  return (
    <section>
      <div className="container max-w-6xl">
        <div className="border-x border-border">
          <BlogList posts={[]} />
        </div>
      </div>
    </section>
  );
}