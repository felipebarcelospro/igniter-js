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
  title: "Igniter.js Boilerplate",
  description: "A customizable boilerplate for Igniter.js applications",
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
