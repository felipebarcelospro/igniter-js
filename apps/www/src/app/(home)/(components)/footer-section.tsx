import Link from "next/link";
import { config } from "@/configs/application";

const linkClassName =
  "text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const linkGroups = [
  {
    title: "Learn",
    links: [
      { label: "Documentation", href: "/docs/core" },
      { label: "Learning center", href: "/learn" },
      { label: "Blog", href: "/blog" },
    ],
  },
  {
    title: "Explore",
    links: [
      { label: "Core quick start", href: "/docs/core/quick-start" },
      { label: "Templates", href: "/templates" },
      { label: "Showcase", href: "/showcase" },
      { label: "Changelog", href: "/changelog" },
    ],
  },
];

export function FooterSection() {
  return (
    <footer className="container max-w-5xl">
      <div className="grid gap-10 px-5 py-10 sm:grid-cols-2 sm:px-8 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr] lg:gap-8">
        <div className="max-w-xs">
          <Link
            href="/"
          className="inline-flex rounded-sm text-base font-semibold tracking-tight text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {config.projectName}
          </Link>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            A TypeScript foundation for backend features and AI-assisted
            development.
          </p>
        </div>

        {linkGroups.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <h2 className="mb-3 text-sm font-semibold text-foreground">
              {group.title}
            </h2>
            <ul className="space-y-2.5">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={linkClassName}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <nav aria-label="Community and project">
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            Community & project
          </h2>
          <ul className="space-y-2.5">
            <li>
              <a
                href={config.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClassName}
              >
                GitHub <span className="sr-only">(opens in a new tab)</span>
              </a>
            </li>
            <li>
              <a
                href={config.discordUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClassName}
              >
                Discord <span className="sr-only">(opens in a new tab)</span>
              </a>
            </li>
            <li>
              <a
                href={config.twitterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClassName}
              >
                X <span className="sr-only">(opens in a new tab)</span>
              </a>
            </li>
            <li>
              <a
                href={config.creator.url}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClassName}
              >
                Created by {config.creator.name}{" "}
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </li>
          </ul>
        </nav>
      </div>

      <div className="flex flex-col gap-2 border-t border-border px-5 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <span>© {new Date().getFullYear()} {config.projectName}</span>
        <span>Built for developers and AI-assisted workflows.</span>
      </div>
    </footer>
  );
}
