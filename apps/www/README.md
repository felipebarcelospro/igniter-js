# Igniter.js Website (`@igniter-js/www`)

This repository contains the source code for the official Igniter.js website and documentation platform, available at [igniterjs.dev](https://igniterjs.dev) (or your framework's domain).

Built with Next.js and Tailwind CSS, this project serves as the central hub for our community, providing marketing information, comprehensive documentation, and guides to help developers get the most out of Igniter.js.

## ✨ Features

-   **Modern Tech Stack:** Built with [Next.js](https://nextjs.org/) (App Router) for a fast, server-rendered React experience.
-   **Rich Content with MDX:** Documentation pages are written in MDX, allowing for interactive React components directly inside markdown.
-   **Beautifully Styled:** Styled with [Tailwind CSS](https://tailwindcss.com/) for a utility-first workflow.
-   **Component-Based UI:** A rich component library built with [Shadcn/ui](https://ui.shadcn.com/) and animated with [Framer Motion](https://www.framer.com/motion/).
-   **Fully Responsive:** Designed to provide an optimal viewing experience across a wide range of devices.

## 🚀 Getting Started

Follow these instructions to set up the project for local development.

### Prerequisites

-   [Node.js](https.md.js.org/) (version specified in the root `package.json`'s `engines` field)
-   [npm](https://www.npmjs.com/) (version 8 or higher recommended for workspace support)

### Installation and Setup

1.  **Clone the Monorepo:**
    If you haven't already, clone the entire Igniter.js monorepo to your local machine.
    ```bash
    git clone https://github.com/your-org/igniter-js.git
    cd igniter-js
    ```

2.  **Install Dependencies:**
    From the root of the monorepo, run the following command to install dependencies for all packages, including this website.
    ```bash
    npm install
    ```
    This command leverages npm workspaces to link all local packages correctly.

3.  **Run the Development Server:**
    Use the npm `--filter` flag to run the development server specifically for the `@igniter-js/www` package.
    ```bash
    npm run dev --filter @igniter-js/www
    ```

4.  **Open in Browser:**
    The website will be running at [http://localhost:3000](http://localhost:3000).

## ✍️ How to Contribute

We welcome contributions from the community! Whether it's fixing a typo, improving documentation, or adding a new feature, your help is appreciated.

### Adding or Editing Documentation

Our documentation is written in MDX (`.mdx`).

1.  **Find the Content:** The documentation files are located in the `src/content/docs` directory (or a similar location, please verify). The file and folder structure in this directory maps directly to the URL paths.
2.  **Make Your Changes:** Create a new file or edit an existing one. You can use standard Markdown syntax as well as custom React components found in `src/components/mdx/`.
3.  **Update Navigation (if needed):** If you add a new page, you may need to add it to the sidebar navigation. This is typically configured in a file like `src/configs/docs-nav.ts`.
4.  **Submit a Pull Request:** Commit your changes and open a pull request against the `main` branch of the monorepo.

### Reporting Issues

If you encounter a bug or have a feature request, please [open an issue](https://github.com/your-org/igniter-js/issues) on our GitHub repository. Provide as much detail as possible, including steps to reproduce the issue.

## 📜 License

This project is licensed under the MIT License. See the [LICENSE](../../LICENSE) file in the root of the monorepo for more details.