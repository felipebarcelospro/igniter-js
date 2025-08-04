---
mode: agent
---
# Prompt: Create Blog Post (Draft in MDX)

## Purpose
Automate the creation of high-quality blog posts for the Igniter.js website. Support multiple creation modes: from scratch, from a template (e.g., release announcement), or by transforming existing documentation into a narrative article. Generate a complete MDX draft in the correct location with all required frontmatter and content sections.

## Prerequisites
- Website app located at `apps/www`.
- Blog posts live under `apps/www/src/app/(content)/blog/(posts)/<category>/<slug>/page.mdx`.
- Categories include (but are not limited to): `announcements`, `tutorials`.

## Step-by-Step Instructions

1. Choose Creation Mode
   - Ask the user to select one of the modes:
     1. From Scratch
     2. From Template (e.g., Release Announcement)
     3. From Documentation (transform doc into blog article)

2. Collect Metadata
   - Title (H1 in the content; no frontmatter needed unless the site requires)
   - Category (`announcements` | `tutorials` | custom)
   - Slug (URL-friendly, kebab-case; if omitted, generate from title)
   - Optional: short summary/abstract to include at the top.

3. Determine Output Path
   - Path: `apps/www/src/app/(content)/blog/(posts)/<category>/<slug>/page.mdx`.
   - Ensure the directory exists; create it if necessary.

4. Mode: From Scratch
   - Ask for a brief outline or key points.
   - Generate a complete article with:
     - H1 title
     - Intro paragraph setting context
     - Sections with H2/H3 headings
     - Code examples using fenced code blocks with appropriate language
     - Conclusion with next steps and links to docs

5. Mode: From Template (Release Announcement)
   - Collect version (e.g., `v0.12.0`), date, and highlights.
   - Fetch conventional commits since last tag if available to draft changes.
   - Structure:
     - H1 `Igniter.js <version> Released`
     - Intro: what’s new and why it matters
     - Highlights (bulleted list)
     - Detailed changes grouped by type (Features, Fixes, Docs, Refactor, Perf, etc.)
     - Breaking Changes section (if any)
     - Upgrade guide: steps to update packages
     - Links to PRs/Issues

6. Mode: From Documentation
   - Ask for doc path(s) or topic(s) to transform.
   - Read the selected documentation files.
   - Create a narrative article:
     - Problem/Context
     - How Igniter.js solves it
     - Walkthrough with code examples
     - Tips, caveats, and best practices
     - Links back to the original docs

7. Generate MDX File
   - Write the `page.mdx` with:
     - H1 title as the first line (`# ...`)
     - Rich content per selected mode
     - Use existing MDX components if relevant (e.g., alerts, callouts)

8. Image & Assets (Optional)
   - If the post needs an image, save under `apps/www/public/blog/<slug>/` and reference with relative path `/blog/<slug>/image.png`.

9. Preview & Review
   - Show a preview of the generated MDX content.
   - Ask for approval to save the file.

10. Save Draft
   - If approved, create the directory and save the MDX at the target path.
   - Confirm the file location to the user.

## Success Criteria
- A complete MDX draft is created in the correct folder structure.
- The article is coherent, technically correct, and uses accurate code snippets.
- For release posts, content aligns with the commit history and changelog.
- The user reviews and approves the final content before saving.
