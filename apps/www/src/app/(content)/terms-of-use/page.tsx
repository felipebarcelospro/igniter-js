import { Button } from "@/components/ui/button";
import Link from "next/link";
import { generateMetadata } from "@/lib/metadata";

export const metadata = generateMetadata({
  title: "Terms of Use",
  description: "Terms of use for Igniter.js, the type-safe full-stack TypeScript framework. Learn about licensing, usage rights, and legal terms.",
  canonical: "/terms-of-use",
  keywords: ["Terms of use", "Igniter.js", "MIT License", "Legal terms", "Open source"]
});

export default function TermsOfUse() {
  return (
    <main className="container mx-auto px-8 py-16 sm:py-12 md:py-16 max-w-screen-md">
      <section className="text-left mb-6 sm:mb-8 relative">
        <Link href="/" passHref>
          <Button
            variant="ghost"
            size="icon"
            className="absolute -top-12 sm:-top-16 left-0 rounded-full bg-secondary hover:bg-secondary/80"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m12 19-7-7 7-7" />
              <path d="M19 12H5" />
            </svg>
            <span className="sr-only">Back</span>
          </Button>
        </Link>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 md:mb-8 leading-tight md:max-w-4xl">
          Terms of Use for Igniter.js Framework
        </h1>
        <p className="text-lg sm:text-xl mb-8 sm:mb-10 md:mb-12 text-muted-foreground">
          By using the Igniter.js framework in your projects, you agree to comply
          with and be bound by the following terms and conditions.
        </p>
      </section>

      <section className="mb-8 p-4 border border-border rounded-lg bg-secondary/50">
        <div className="grid grid-cols-1 gap-6 sm:gap-8">
          <div className="bg-secondary/10 p-6 sm:p-8 rounded-lg">
            <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">
              1. MIT License Terms
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground">
              Igniter.js is distributed under the MIT License. This means you are
              free to use, modify, distribute, and sublicense the framework,
              provided you include the original copyright notice and permission
              notice in all copies or substantial portions of the software.
            </p>
          </div>

          <div className="bg-secondary/10 p-6 sm:p-8 rounded-lg">
            <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">
              2. Library Usage
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground">
              Igniter.js is a type-safe full-stack TypeScript framework designed for modern web development. You
              may use it for building APIs, web applications, real-time features, and type-safe client-server communication. The
              framework is provided as open-source software for the developer
              community.
            </p>
          </div>

          <div className="bg-secondary/10 p-6 sm:p-8 rounded-lg">
            <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">
              3. No Warranty
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground">
              As stated in the MIT License, the framework is provided "as is",
              without warranty of any kind, express or implied. This includes
              but is not limited to the warranties of merchantability, fitness
              for a particular purpose, and noninfringement.
            </p>
          </div>

          <div className="bg-secondary/10 p-6 sm:p-8 rounded-lg">
            <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">
              4. Contributions
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground">
              Contributions to Igniter.js are welcome. By submitting code changes
              through pull requests, you agree to license your contributions
              under the same MIT License terms. Please follow the contribution
              guidelines in our repository for code standards and submission
              process.
            </p>
          </div>

          <div className="bg-secondary/10 p-6 sm:p-8 rounded-lg">
            <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">
              5. Limitation of Liability
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground">
              In no event shall the authors or copyright holders be liable for
              any claim, damages or other liability, whether in an action of
              contract, tort or otherwise, arising from, out of or in connection
              with the framework or the use or other dealings in the framework.
            </p>
          </div>

          <div className="bg-secondary/10 p-6 sm:p-8 rounded-lg">
            <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">
              6. Documentation and Support
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground">
              Documentation is provided through our GitHub repository. While we
              strive to maintain comprehensive documentation, support is
              provided on a best-effort basis through GitHub issues and
              discussions.
            </p>
          </div>

          <div className="bg-secondary/10 p-6 sm:p-8 rounded-lg">
            <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">
              7. Contact Information
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground mb-4">
              For questions, bug reports, or contributions, please use our
              GitHub repository:
            </p>
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-gray-200 p-4 rounded-lg flex flex-col items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 mb-2"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                <a
                  href="https://github.com/felipebarcelospro/igniter-js"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base font-semibold text-center"
                >
                  GitHub Repository
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="text-center mt-8 sm:mt-12">
        <Button size="lg" className="w-full sm:w-auto" asChild>
          <Link href="/">Return to Home</Link>
        </Button>
      </div>
    </main>
  );
}
