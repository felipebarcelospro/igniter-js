import * as React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRightIcon } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { config } from '@/configs/application'
import { DateUtils } from '@/lib/date'
import type { ContentTypeBlogEntry } from '@/app/blog/source'

/**
 * Blog post card component props
 */
export interface SiteBlogPostCardProps {
  className?: string
  post: ContentTypeBlogEntry
  variant?: 'default' | 'featured' | 'compact'
  showExcerpt?: boolean
  showAuthor?: boolean
  showDate?: boolean
  showTags?: boolean
  maxExcerptLength?: number
}

export function SiteBlogPostCard({
  post,
  variant = 'default',
  showExcerpt = true,
  showAuthor = true,
  showDate = true,
  showTags = true,
  maxExcerptLength = 150,
  className = '',
}: SiteBlogPostCardProps) {
  // Generate excerpt if needed
  const excerpt = React.useMemo(() => {
    if (!showExcerpt || !post.data.description) return null

    const text =
      post.data.description.length > maxExcerptLength
        ? `${post.data.description.substring(0, maxExcerptLength)}...`
        : post.data.description

    return text
  }, [post.data.description, maxExcerptLength, showExcerpt])

  // Card styling based on variant
  const cardClasses = React.useMemo(() => {
    const baseClasses =
      'group w-full bg-background border rounded-md hover:bg-secondary transition-all duration-200'

    switch (variant) {
      case 'featured':
        return `${baseClasses} p-6 h-72 flex flex-col justify-between hover:bg-secondary`
      case 'compact':
        return `${baseClasses} p-4 flex gap-4 hover:bg-accent`
      default:
        return `${baseClasses} p-6 flex flex-col justify-between`
    }
  }, [variant])

  return (
    <Link href={post.url} className={cardClasses}>
      <div className={cn(['flex flex-col', className])}>
        {/* Compact variant layout */}
        {variant === 'compact' && post.data.cover && (
          <div className="shrink-0">
            <Image
              src={post.data.cover}
              alt={post.data.title}
              width={120}
              height={80}
              className="w-32 h-20 object-cover rounded-md"
            />
          </div>
        )}

        <div
          className={
            variant === 'compact' ? 'flex-1 min-w-0 mt-auto' : 'flex-1'
          }
        >
          {/* Author and Date */}
          {(showAuthor || showDate) && (
            <div className="flex items-center space-x-2 text-xs mb-6">
              {showAuthor && (
                <div className="flex items-center space-x-2">
                  <Avatar className="size-4 rounded-full">
                    <AvatarFallback>{config.creator.name[0]}</AvatarFallback>
                    <AvatarImage src={config.creator.image} />
                  </Avatar>
                  <span className="text-muted-foreground">
                    {config.creator.name}
                  </span>
                </div>
              )}

              {showDate && post.data.lastModified && (
                <span className="text-muted-foreground">
                  {DateUtils.formatDate(post.data.lastModified, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              )}
            </div>
          )}

          {/* Tags */}
          {showTags && post.data.tags && post.data.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {post.data.tags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-xs px-2 py-0.5"
                >
                  {tag}
                </Badge>
              ))}
              {post.data.tags.length > 3 && (
                <Badge variant="outline" className="text-xs px-2 py-0.5">
                  +{post.data.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Title */}
          <h3 className="font-semibold text-sm group-hover:text-primary transition-colors mb-2 line-clamp-2">
            {post.data.title}
          </h3>

          {/* Excerpt */}
          {excerpt && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {excerpt}
            </p>
          )}
        </div>

        {/* Read more indicator */}
        <div className="mt-4 flex items-center text-xs text-primary font-medium">
          <span>Read more</span>
          <ArrowUpRightIcon className="ml-1 size-3 opacity-30" />
        </div>
      </div>
    </Link>
  )
}
