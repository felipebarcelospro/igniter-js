import { Metadata } from "next";
import { BlogLayout } from "./components/blog-layout";

export const metadata: Metadata = {
  title: "Blog Post",
  description: "Detailed blog post content.",
};

export default function BlogPostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <BlogLayout>{children}</BlogLayout>;
}
