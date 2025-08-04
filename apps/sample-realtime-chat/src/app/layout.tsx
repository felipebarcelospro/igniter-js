import type { Metadata } from "next";

import { Geist, Geist_Mono } from "next/font/google";
import { IgniterProvider } from '@igniter-js/core/client'

import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Igniter.js | Real-Time Chat Example",
  description: "A real-time chat application built with Igniter.js, Next.js, and Prisma.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased dark`}
      >
        <IgniterProvider>
          {children}
        </IgniterProvider>
      </body>
    </html>
  );
}
