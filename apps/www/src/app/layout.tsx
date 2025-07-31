import "./globals.css";

import { Footer } from "@/app/(shared)/components/footer";
import { Header } from "@/app/(shared)/components/header";
import { ThemeProvider } from "@/components/theme-provider";
import { config } from "@/configs/application";
import { githubService } from "@/lib/github";
import { cn } from "@/lib/utils";
import { GoogleAnalytics } from "@next/third-parties/google";
import type { Metadata } from "next";
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';

export const metadata: Metadata = {
  title: {
    absolute: config.projectName,
    template: `%s • ${config.projectName}`,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const repoInfo = await githubService.getRepositoryInfo();

  return (
    <html lang="en" suppressContentEditableWarning suppressHydrationWarning>
      <body
        className={cn(GeistSans.variable, GeistMono.variable, "antialiased")}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Header repoInfo={repoInfo} />
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID ?? ""} />
          <div>{children}</div>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
