import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { Layers2Icon, PlayCircleIcon, Users2, Users2Icon } from 'lucide-react';

export function baseOptions(): BaseLayoutProps {
  return {
    githubUrl: 'https://github.com/felipebarcelospro/igniter-js',
    nav: {
      title: 'My App',
    },
    links: [
      {
        text: '_hello',
        url: '/',
      },
      {
        text: '_documentation',
        url: '/docs',
      },
      {
        text: '_blog',
        url: '/blog',
      },
      {
        text: '_templates',
        url: '/templates',
      },
      {
        text: '_learn',
        url: '/learn',
      },
      {
        text: '_showcase',
        url: '/showcase',
      },
      {
        text: '_community',
        url: '/community',
      }
    ]
  };
}
