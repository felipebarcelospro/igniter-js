import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { Layers2Icon, PlayCircleIcon, Users2, Users2Icon } from 'lucide-react';

export function docsOptions(): BaseLayoutProps {
  return {
    githubUrl: 'https://github.com/felipebarcelospro/igniter-js',
    links: [
      {
        text: 'Core',
        url: '/docs',
      },
      {
        text: 'CLI',
        url: '/docs/cli',
      },
      {
        text: 'Store',
        url: '/docs/store',
      },
      {
        text: 'Jobs',
        url: '/docs/jobs',
      },
      {
        text: 'MCP Server',
        url: '/docs/adapter-mcp-server',
      },
      {
        text: 'Bot',
        url: '/docs/bot',
      },
      {
        text: 'Telemetry',
        url: '/docs/telemetry',
      }
    ]
  };
}
