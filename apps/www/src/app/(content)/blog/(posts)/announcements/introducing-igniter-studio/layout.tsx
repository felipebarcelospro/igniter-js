import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const title = "Introducing Igniter Studio: The Interactive API Playground";
  const description = "Announcing Igniter Studio, an interactive API playground to streamline your development workflow, with a future powered by AI assistance.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: "https://igniterjs.com/blog/announcements/introducing-igniter-studio",
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
