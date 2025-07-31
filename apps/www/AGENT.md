# AI Agent Maintenance Manual: Igniter.js Website (`@igniter-js/www`)

**Version:** 1.0.0
**For Agent Use Only.**

This document provides a detailed technical guide for maintaining the Igniter.js official website and documentation platform, located in the `apps/www` directory. This project is a Next.js application responsible for marketing content, documentation, and interactive examples.

---

## 1. Project Overview

**Name:** `@igniter-js/www`

**Purpose:** This package serves as the public-facing website for the Igniter.js framework. Its primary responsibilities are:
1.  **Marketing & Landing Pages:** To introduce new users to Igniter.js and highlight its key features.
2.  **Official Documentation:** To host comprehensive, searchable documentation, tutorials, and API references.
3.  **Community Hub:** To provide links to the GitHub repository, Discord server, and other community resources.

The website is built with Next.js and uses MDX for documentation, allowing for interactive React components directly within markdown files.

---

## 2. Technical Stack

-   **Framework:** [Next.js](https://nextjs.org/) (App Router)
-   **Language:** [TypeScript](https://www.typescriptlang.org/)
-   **Styling:** [Tailwind CSS](https://tailwindcss.com/) with `clsx` and `tailwind-merge` for utility class management.
-   **UI Components:**
    -   [Shadcn/ui](https://ui.shadcn.com/): A collection of accessible and composable React components.
    -   [Framer Motion](https://www.framer.com/motion/): For animations and interactive elements.
-   **Content:** [MDX](https://mdxjs.com/) (`@next/mdx`) for embedding React components within markdown documentation.
-   **State Management:** [Jotai](https://jotai.org/) for global state management where needed.
-   **Code Highlighting:** `rehype-highlight` and `tailwind-highlightjs` for syntax highlighting in code blocks.

---

## 3. Project Structure

The project follows the standard Next.js App Router structure within the `src/` directory.

-   **`src/app/`**: The core of the application, containing all routes and layouts.
    -   **`src/app/(main)/`**: Route group for the main marketing and informational pages (e.g., landing page, pricing).
    -   **`src/app/(content)/`**: Route group for content-heavy pages like documentation and guides. This group likely uses a different layout to accommodate sidebars and navigation.
        -   `src/app/(content)/docs/[[...slug]]/page.tsx`: The dynamic route that renders all documentation pages from MDX files.
    -   **`src/app/layout.tsx`**: The root layout for the entire application.
    -   **`src/app/globals.css`**: Global CSS styles, including Tailwind CSS imports.

-   **`src/components/`**: Contains all shared and reusable React components.
    -   **`src/components/ui/`**: Components sourced from `shadcn/ui`. **Do not modify these directly.** Use the `shadcn-ui` CLI to update them.
    -   **`src/components/mdx/`**: Custom components designed specifically to be used within MDX files (e.g., callouts, interactive code examples).
    -   **`src/components/layout/`**: Components related to page structure, such as `Header`, `Footer`, `Sidebar`.

-   **`src/lib/`**: Utility functions, helper scripts, and library configurations.
    -   `src/lib/utils.ts`: General utility functions, including the `cn` helper from Shadcn.
    -   `src/lib/docs.ts`: (Likely location) A module for fetching and parsing documentation content from the filesystem (MDX files).

-   **`src/hooks/`**: Custom React hooks used throughout the application.

-   **`public/`**: Contains all static assets like images, fonts, and icons.

-   **`content/`**: (Anticipated location, if not co-located with routes) Directory containing the MDX files for the documentation. You may need to verify the exact location, which is configured in `next.config.mjs`.

---

## 4. Key Workflows

### 4.1. Running the Website Locally

1.  **Navigate to the project root:** From the monorepo root, you can run commands using the `npm` workspace filter.
2.  **Install Dependencies:** Ensure all dependencies are installed by running `npm install` from the monorepo root.
3.  **Run Development Server:**
    ```bash
    npm run dev --filter @igniter-js/www
    ```
    The website will be available at `http://localhost:3000`.

### 4.2. Adding or Updating Documentation

1.  **Locate the MDX files:** Find the directory where the documentation's markdown (`.mdx`) files are stored. This is typically a `content/docs` or `src/app/(content)/docs` directory.
2.  **Create or Edit:** Add a new `.mdx` file or edit an existing one. The file's path will determine its URL slug.
3.  **Frontmatter:** Ensure the file includes the necessary frontmatter at the top (e.g., `title`, `description`) as this metadata is used to build the page and sidebar navigation.
4.  **Navigation:** You may need to update a configuration file (e.g., `src/configs/docs.ts`) that defines the structure of the documentation sidebar to make the new page visible.
5.  **Use MDX Components:** Leverage custom components from `src/components/mdx/` to create rich, interactive content.

### 4.3. Adding a New UI Component

1.  **Use `shadcn-ui` CLI:** For common UI patterns, use the `shadcn-ui` CLI to add new components. This ensures they are added correctly to `src/components/ui`.
    ```bash
    npx shadcn-ui@latest add <component-name>
    ```
2.  **Create Custom Component:** For bespoke components, create a new file in `src/components/` (or a relevant subdirectory) and build it using React and Tailwind CSS. Ensure it adheres to the project's coding standards.

---

## 5. Deployment

The website is automatically deployed via a GitHub Action whenever changes are pushed to the `main` branch. The workflow is defined in `.github/workflows/`. It performs the following steps:

1.  Checks out the code.
2.  Installs dependencies (`npm install`).
3.  Builds the Next.js application (`npm run build --filter @igniter-js/www`).
4.  Deploys the static output from the `out` directory to the hosting provider (e.g., Vercel, Netlify, or GitHub Pages).

Refer to the specific deployment workflow file for precise details.