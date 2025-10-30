import { RootProvider } from 'fumadocs-ui/provider/next';
import './global.css';
import { Inter } from 'next/font/google';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { baseOptions } from '@/app/layout.shared';
import { getDefaultMetadata } from '@/lib/metadata';

const inter = Inter({
  subsets: ['latin'],
});

export const metadata = getDefaultMetadata();

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider>
          <HomeLayout {...baseOptions()}>{children}</HomeLayout>
        </RootProvider>
      </body>
    </html>
  );
}
