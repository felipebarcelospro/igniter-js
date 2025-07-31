import Link from "next/link";

import { Button } from "@/components/ui/button";
import { config } from "@/configs/application";
import { generateMetadata } from "@/lib/metadata";

export const metadata = generateMetadata({
  title: "Privacy Policy",
  description: "Privacy policy for Igniter.js framework. Learn about data handling, security practices, and privacy protection in our type-safe full-stack TypeScript framework.",
  canonical: "/privacy-policy",
  keywords: ["Privacy policy", "Igniter.js", "Data protection", "Security", "Open source"]
});

export default function PrivacyPolicy() {
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
          Privacy Policy for {config.projectName}
        </h1>
        <p className="text-lg sm:text-xl mb-8 sm:mb-10 md:mb-12 text-muted-foreground">
          This policy outlines our practices regarding the {config.projectName}{" "}
          framework, a type-safe full-stack TypeScript framework for modern web development.
        </p>
      </section>

      <section className="mb-8 p-2 sm:p-4 border border-border rounded-lg bg-secondary/50">
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:gap-8">
          <div className="bg-secondary/10 p-4 sm:p-6 md:p-8 rounded-lg">
            <h2 className="text-xl sm:text-2xl font-semibold mb-2 sm:mb-4">
              1. Library Usage and Data Handling
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground">
              {config.projectName} is an open-source full-stack TypeScript framework. As
              a framework, it does not collect, store, or transmit any personal data
              itself. All data operations are performed within your
              application's context using your chosen database and storage solutions. The
              framework provides the tools and interfaces for building type-safe applications,
              but the actual data handling is controlled entirely by your
              application and your chosen infrastructure.
            </p>
          </div>

          <div className="bg-secondary/10 p-4 sm:p-6 md:p-8 rounded-lg">
            <h2 className="text-xl sm:text-2xl font-semibold mb-2 sm:mb-4">
              2. Data Storage Responsibility
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground">
              When using {config.projectName}, all data storage and management
              is handled by your application through your chosen database and storage solutions. We do not have
              access to any data stored or managed using our framework. It is your
              responsibility to ensure proper data handling and compliance with
              relevant privacy laws and regulations in your application.
            </p>
          </div>

          <div className="bg-secondary/10 p-4 sm:p-6 md:p-8 rounded-lg">
            <h2 className="text-xl sm:text-2xl font-semibold mb-2 sm:mb-4">
              3. Open Source Nature
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground">
              {config.projectName} is an open-source framework, similar to Next.js,
              Remix, or T3 Stack. The source code is publicly available and can
              be audited on GitHub. We maintain transparency about the framework's
              functionality and encourage community contributions while adhering
              to best practices in software development.
            </p>
          </div>

          <div className="bg-secondary/10 p-4 sm:p-6 md:p-8 rounded-lg">
            <h2 className="text-xl sm:text-2xl font-semibold mb-2 sm:mb-4">
              4. Security Best Practices
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground">
              While we strive to maintain secure coding practices in our framework
              implementation, the security of your data depends on how you
              implement and use {config.projectName} in your application. We
              recommend following modern web security best practices and implementing
              appropriate access controls in your application.
            </p>
          </div>

          <div className="bg-secondary/10 p-4 sm:p-6 md:p-8 rounded-lg">
            <h2 className="text-xl sm:text-2xl font-semibold mb-2 sm:mb-4">
              5. Updates and Versioning
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground">
              We maintain version control and documentation of changes through
              our GitHub repository. Any updates to the framework will be
              published with appropriate version numbers following semantic
              versioning principles. Users can choose when to upgrade to newer
              versions of the framework.
            </p>
          </div>

          <div className="bg-secondary/10 p-6 sm:p-8 rounded-lg">
            <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">
              6. Contact Information
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground mb-4">
              For questions about the framework or to report issues:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-200 p-4 rounded-lg flex flex-col items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 mb-2"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                <a
                  href="mailto:felipebarcelospro@gmail.com"
                  className="text-base font-semibold text-center"
                >
                  felipebarcelospro@gmail.com
                </a>
              </div>
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

      <div className="text-center mt-8">
        <Button size="lg" className="w-full sm:w-auto" asChild>
          <Link href="/">Return to Home</Link>
        </Button>
      </div>
    </main>
  );
}
