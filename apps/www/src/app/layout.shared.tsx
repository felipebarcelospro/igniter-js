import { Logo } from '@/components/site/logo';
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { Layers2Icon, PlayCircleIcon, Users2, Users2Icon } from 'lucide-react';

export function baseOptions(): BaseLayoutProps {
  return {
    githubUrl: 'https://github.com/felipebarcelospro/igniter-js',
    nav: {
      title: (
        // biome-ignore lint/a11y/noStaticElementInteractions: <explanation>
        <div
          className="text-foreground text-[22px]"
          title="Right click for design assets"
        >
          <span className="text-foreground font-semibold tracking-tight flex items-center gap-1.5">
            <Logo />
          </span>
        </div>
      ),
    },
    links: [
      {
        text: 'hello',
        url: '/',
      },
      {
        text: 'documentation',
        url: '/docs/core',
      },
      {
        text: 'blog',
        url: '/blog',
      },
      {
        text: 'templates',
        url: '/templates',
      },
      {
        text: 'learn',
        url: '/learn',
      },
      {
        text: 'showcase',
        url: '/showcase',
      },
      {
        text: 'changelog',
        url: '/changelog',
      },
      {
        text: 'community',
        url: 'https://discord.com/invite/JKGEQpjvJ6',
      }
    ]
  };
}
