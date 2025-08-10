import { parseURL } from "@/utils";
import type { DocsConfig } from "../types";


// Interfaces for better SOLID principles
interface IPlaygroundSecurity {
  /**
   * Checks access to the playground.
   * @param request The incoming HTTP request.
   * @param playgroundConfig The playground configuration.
   * @returns A Promise resolving to a Response object if access is denied (e.g., 403, 401, 404),
   *          or null if access is granted.
   */
  checkAccess(request: Request, playgroundConfig?: DocsConfig['playground']): Promise<Response | null>;
}

interface IPlaygroundHtmlGenerator {
  /**
   * Generates the HTML content for the playground UI.
   * @param docsConfig The documentation configuration, used for title etc.
   * @param basePath The base path for the application.
   * @returns The HTML string.
   */
  generate(docsConfig?: DocsConfig, basePath?: string): string;
}

// Concrete implementation for security checks
class PlaygroundSecurityService implements IPlaygroundSecurity {
  async checkAccess(request: Request, playgroundConfig?: DocsConfig['playground']): Promise<Response | null> {
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
      if (!playgroundConfig?.security) {
        // Disable playground in production if no security is provided
        return new Response('Not Found', { status: 404 });
      }

      try {
        const hasAccess = await Promise.resolve(playgroundConfig.security(request));
        if (!hasAccess) {
          return new Response('Forbidden', { status: 403 });
        }
      } catch (error) {
        // Log the error if necessary for debugging, but return a generic unauthorized status
        // console.error('Playground security check failed:', error);
        return new Response('Unauthorized', { status: 401 });
      }
    }
    return null; // Access granted or not in production
  }
}

// Concrete implementation for HTML generation using Scalar UI
class ScalarHtmlGenerator implements IPlaygroundHtmlGenerator {
  generate(docsConfig?: DocsConfig, basePath?: string): string {
    const playgroundBasePath = docsConfig?.playground?.route || '/docs';
    const openAPI = parseURL(basePath || '', playgroundBasePath, '/openapi.json')

    return `<!doctype html>
<html>
  <head>
    <title>${docsConfig?.info?.title ?? 'Unnamed'} (${docsConfig?.info?.version ?? '1.0.0'}) - Igniter Studio</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet" />

    <style>
      * {
        font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      #app>div>div.scalar-app.scalar-api-reference.references-layout.scalar-api-references-standalone-mobile.scalar-scrollbars-obtrusive.references-sidebar>aside>div>div>div.flex.flex-col.gap-3.p-3.border-t.darklight-reference {
        display: none;
      }

      .open-api-client-button {
        display: none!important;
      }

      #app .references-navigation-list[data-v-c369ccec] {
        top: 2.8rem!important;
      }

      #app .section {
        padding: 48px 16px!important;
      }

      #app .section .section-header-label {
        font-size: 1rem;
      }

      #app .section .section-columns {
        gap: 16px!important;
      }

      #app .section .section-header {
        margin-bottom: 0!important;
      }

      .header {
        position: sticky;
        top: 0;
        z-index: 2;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.50rem 1rem;
        border-bottom: 1px solid #222;
        background: rgba(0, 0, 0, 0.2);
        backdrop-filter: blur(10px);
      }

      .header img {
        height: 22px;
      }

      .header-actions {
        display: flex;
        gap: 1rem;
        align-items: center;
      }

      .theme-toggle {
        background: none;
        border: none;
        color: #fff;
        cursor: pointer;
        padding: 0.5rem;
      }

      .social-links {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .social-links a {
        color: #fff;
        text-decoration: none;
        display: flex;
        align-items: center;
      }

      .social-links a svg {
        height: 16px;
        width: 16px;
      }

      .docs-link {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-family: 'Geist Mono', monospace;
        font-size: 10px;
        color: rgba(255, 255, 255, 0.6);
        text-decoration: none;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        transition: opacity 0.2s ease;
        padding: 0.4rem 1rem;
        border: 1px solid #222;
        border-radius: 8rem;
      }

      .docs-link:hover {
        opacity: 1;
        color: rgba(255, 255, 255, 1);
      }

      .docs-link span {
        white-space: nowrap;
      }
    </style>
  </head>

  <body>
    <header class="header">
      <img src="https://igniterjs.com/logo-light.svg" alt="Igniter Logo" />

      <div class="header-actions">
        <div class="social-links">
          <a href="https://github.com/igniterjs" target="_blank">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </a>
          <a href="https://twitter.com/igniterjs" target="_blank">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
        </div>
         <a href="https://igniterjs.com" target="_blank" class="docs-link">
            <span>Powered By Igniter.js</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
              <path d="M7 17L17 7M17 7H7M17 7V17"/>
            </svg>
          </a>
       </div>
    </header>

    <main>
      <div id="app"></div>
    </main>

    <!-- Load the Script -->
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>

    <script>
      // Initialize the Scalar API Reference
      Scalar.createApiReference('#app', {
        url: '${openAPI}'
      })
    </script>
  </body>
</html>`
  }
}

// Main handler class that orchestrates security and HTML generation
class PlaygroundRequestHandler {
  private securityService: IPlaygroundSecurity;
  private htmlGenerator: IPlaygroundHtmlGenerator;

  constructor(securityService: IPlaygroundSecurity, htmlGenerator: IPlaygroundHtmlGenerator) {
    this.securityService = securityService;
    this.htmlGenerator = htmlGenerator;
  }

  async handle(request: Request, docsConfig?: DocsConfig, basePath?: string): Promise<Response> {
    try {
      // Requirement 5.5: Security check
      const securityResponse = await this.securityService.checkAccess(request, docsConfig?.playground);
      if (securityResponse) {
        return securityResponse; // Early exit if security check fails
      }

      const url = new URL(request.url)
      const openApiContent = JSON.stringify(docsConfig?.openapi);
      const playgroundBasePath = docsConfig?.playground?.route || '/docs';
      const openApiPath = parseURL(basePath || '', playgroundBasePath, '/openapi.json');

      if (url.pathname === openApiPath) {
        return new Response(openApiContent, {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Requirement 5.7: Construct HTML response with Scalar UI
      const scalarHtml = this.htmlGenerator.generate(docsConfig, basePath);

      return new Response(scalarHtml, {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      });
    } catch (error) {
      console.error('Error generating Igniter Studio:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  }
}

export function initializeIgniterPlayground(docsConfig?: DocsConfig, basePath?: string): {
  process: (request: Request) => Promise<Response>;
} {
  // Instantiate the services and the main handler.
  // These instances are created once when the module loads,
  // following the singleton pattern for these services within this module scope.
  const playgroundSecurityService = new PlaygroundSecurityService();
  const playgroundHtmlGenerator = new ScalarHtmlGenerator();

  const playgroundRequestHandlerInstance = new PlaygroundRequestHandler(
    playgroundSecurityService,
    playgroundHtmlGenerator
  );

  return {
    process: (request: Request) => playgroundRequestHandlerInstance.handle(request, docsConfig, basePath)
  };
}
