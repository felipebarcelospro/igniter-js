import fs from "fs";
import path from "path";

export interface ContentSection {
  title: string;
  items: ContentMetadata[];
}

export interface ContentMetadata {
  title: string;
  type: "blog" | "docs";
  category: string;
  date: string;
  description: string;
  slug: string;
  order?: number;
}

export type ContentType = ContentMetadata["type"];

export class FileSystemContentManager {
  private static config = {
    contentDir: path.join(process.cwd(), "src/app/(content)"),
    extensions: [".mdx"],
    pageFile: "page.mdx",
    appRouterGroupRegex: /^[\(\[].+[\)\]]$/,
  };

  static async getNavigationItems(
    contentType: "docs" | "blog",
  ): Promise<ContentSection[]> {
    try {
      const contentPath = path.join(this.config.contentDir, contentType);
      const sections: ContentSection[] = [];

      // Process root files first
      const rootItems = await this.processRootFiles(contentPath, contentType);
      if (rootItems.length > 0) {
        sections.push({
          title: contentType === "blog" ? "Posts" : "Getting Started",
          items: rootItems.sort((a, b) => {
            if (contentType === "blog") {
              // Sort blog posts by date descending
              return new Date(b.date).getTime() - new Date(a.date).getTime();
            }
            return (a.order || 0) - (b.order || 0);
          }),
        });
      }

      const entries = fs.readdirSync(contentPath, { withFileTypes: true });
      const directories = entries.filter((entry) => entry.isDirectory());

      for (const dir of directories) {
        // Skip Next.js app router special folders
        if (this.config.appRouterGroupRegex.test(dir.name)) {
          const groupPath = path.join(contentPath, dir.name);
          // Recursively process contents inside group folders
          const groupSections = await this.processGroupFolder(
            groupPath,
            contentType,
          );
          sections.push(...groupSections);
          continue;
        }

        const sectionPath = path.join(contentPath, dir.name);
        const items = await this.processDirectory(
          sectionPath,
          contentType,
          dir.name,
        );

        if (items.length > 0) {
          sections.push({
            title: this.formatTitle(dir.name),
            items: items.sort((a, b) => (a.order || 0) - (b.order || 0)),
          });
        }
      }

      return sections;
    } catch (error) {
      console.error("Error getting navigation items:", error);
      return [];
    }
  }

  static async getAllNavigationItems(): Promise<ContentSection[]> {
    const [docs, blog] = await Promise.all([
      this.getNavigationItems("docs"),
      this.getNavigationItems("blog")
    ]);

    return [...docs, ...blog];
  }

  private static async processGroupFolder(
    groupPath: string,
    contentType: ContentMetadata["type"],
  ): Promise<ContentSection[]> {
    const sections: ContentSection[] = [];
    const entries = fs.readdirSync(groupPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        // Skip nested app router special folders
        if (this.config.appRouterGroupRegex.test(entry.name)) {
          const nestedGroupPath = path.join(groupPath, entry.name);
          const nestedSections = await this.processGroupFolder(
            nestedGroupPath,
            contentType,
          );
          sections.push(...nestedSections);
          continue;
        }

        const sectionPath = path.join(groupPath, entry.name);
        const items = await this.processDirectory(
          sectionPath,
          contentType,
          entry.name,
        );

        if (items.length > 0) {
          sections.push({
            title: this.formatTitle(entry.name),
            items: items.sort((a, b) => (a.order || 0) - (b.order || 0)),
          });
        }
      }
    }

    return sections;
  }

  private static async processRootFiles(
    contentPath: string,
    contentType: ContentMetadata["type"],
  ): Promise<Array<ContentMetadata>> {
    const items: Array<ContentMetadata> = [];
    const entries = fs.readdirSync(contentPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory() && entry.name === this.config.pageFile) {
        const filePath = path.join(contentPath, entry.name);
        const content = fs.readFileSync(filePath, "utf8");
        const metadata = await this.extractFrontmatter(
          content,
          contentType,
          filePath,
        );

        items.push({
          ...metadata,
          title: metadata.title || "Introduction",
          date: metadata.date,
          description: metadata.description,
          slug: "",
          order: -1,
          type: contentType,
          category: "root",
        });
      }
    }

    return items;
  }

  private static async processDirectory(
    dirPath: string,
    contentType: ContentMetadata["type"],
    section: string,
  ): Promise<Array<ContentMetadata>> {
    const items: Array<ContentMetadata> = [];
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Skip app router special folders
        if (this.config.appRouterGroupRegex.test(entry.name)) {
          const groupItems = await this.processDirectory(
            fullPath,
            contentType,
            section,
          );
          items.push(...groupItems);
          continue;
        }

        // Check for page.mdx in folder
        const pagePath = path.join(fullPath, this.config.pageFile);
        if (fs.existsSync(pagePath)) {
          const content = fs.readFileSync(pagePath, "utf8");
          const metadata = await this.extractFrontmatter(
            content,
            contentType,
            pagePath,
          );
          const slug = entry.name;

          items.push({
            title: metadata.title || this.formatTitle(slug),
            category: section,
            date: metadata.date,
            description: metadata.description,
            slug: `${section}/${slug}`,
            order: metadata.order || 0,
            type: contentType,
          });
        }

        // Process subdirectories recursively
        const subItems = await this.processDirectory(
          fullPath,
          contentType,
          `${section}/${entry.name}`,
        );
        items.push(...subItems);
      }
    }

    return items;
  }

  private static formatTitle(slug: string): string {
    return slug
      .replace(/-/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  private static async extractFrontmatter(
    content: string,
    type: "blog" | "docs",
    filePath: string,
  ): Promise<ContentMetadata> {
    // First look for markdown title
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const stats = fs.statSync(filePath);
    const category = path.basename(path.dirname(filePath));

    if (titleMatch) {
      const title = titleMatch[1].trim();
      return {
        title,
        type,
        category,
        date: stats.birthtime.toISOString(),
        description: "",
        slug: `${category}/${title.toLowerCase().replace(/\s+/g, "-")}`,
        order: 0,
      };
    }

    // Then look for frontmatter
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      return {
        title: "",
        type,
        category,
        date: stats.birthtime.toISOString(),
        description: "",
        slug: `${category}`,
        order: 0,
      };
    }

    try {
      const frontmatterContent = match[1];
      const metadata: Record<string, string> = {};

      frontmatterContent.split("\n").forEach((line) => {
        const [key, ...values] = line.split(":");
        if (key && values.length) {
          metadata[key.trim()] = values
            .join(":")
            .trim()
            .replace(/^["'](.*)["']$/, "$1");
        }
      });

      const title = metadata.title || "";
      const slug = metadata.slug || title.toLowerCase().replace(/\s+/g, "-");

      return {
        title,
        type,
        category,
        date: metadata.date || stats.birthtime.toISOString(),
        description: metadata.description || "",
        slug: `${category}/${slug}`,
        order: Number(metadata.order) || 0,
      };
    } catch (error) {
      console.error("Error parsing frontmatter:", error);
      return {
        title: "",
        type,
        category,
        date: stats.birthtime.toISOString(),
        description: "",
        slug: `${category}`,
        order: 0,
      };
    }
  }
}
