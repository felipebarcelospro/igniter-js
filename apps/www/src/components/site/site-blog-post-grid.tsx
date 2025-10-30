import * as React from 'react'
import { SiteBlogPostCard } from './site-blog-post-card'
import type { ContentTypeBlogEntry } from '@/app/blog/source'

/**
 * Blog post grid component props
 */
export interface SiteBlogPostGridProps {
  posts: ContentTypeBlogEntry[]
  variant?: 'featured' | 'default'
  className?: string
  showExcerpt?: boolean
  showAuthor?: boolean
  showDate?: boolean
  showTags?: boolean
  maxExcerptLength?: number
  columns?: 1 | 2 | 3 | 4
}

export function SiteBlogPostGrid({
  posts,
  variant = 'default',
  showExcerpt = true,
  showAuthor = true,
  showDate = true,
  showTags = true,
  maxExcerptLength = 150,
  columns = 3,
  className = '',
}: SiteBlogPostGridProps) {
  // Generate responsive grid classes based on column count
  const gridClasses = React.useMemo(() => {
    const baseClasses = 'grid gap-4'

    switch (columns) {
      case 1:
        return `${baseClasses} grid-cols-1`
      case 2:
        return `${baseClasses} grid-cols-1 md:grid-cols-2`
      case 3:
        return `${baseClasses} grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
      case 4:
        return `${baseClasses} grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
      default:
        return `${baseClasses} grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
    }
  }, [columns])

  // Handle empty state
  if (!posts || posts.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <p className="text-muted-foreground">No blog posts found.</p>
      </div>
    )
  }

  return (
    <div className={gridClasses}>
      {posts.map((post) => (
        <SiteBlogPostCard
          key={post.url}
          post={post}
          variant={variant}
          showExcerpt={showExcerpt}
          showAuthor={showAuthor}
          showDate={showDate}
          showTags={showTags}
          maxExcerptLength={maxExcerptLength}
          className="h-full"
        />
      ))}
    </div>
  )
}
