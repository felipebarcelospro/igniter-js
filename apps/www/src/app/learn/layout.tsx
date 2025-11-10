import { source } from '@/app/learn/source'
import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import type { ReactNode } from 'react'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{
        enabled: false,
      }}
      sidebar={{
        collapsible: false,
        defaultOpenLevel: 0,
      }}
      searchToggle={{
        enabled: false,
      }}
    >
      {children}
    </DocsLayout>
  )
}
