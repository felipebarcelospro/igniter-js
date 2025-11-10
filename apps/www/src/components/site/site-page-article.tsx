'use client'

import * as React from 'react'
import { ChevronRightIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { InlineTOC } from 'fumadocs-ui/components/inline-toc'
import { AnchorProvider, AnchorProviderProps } from 'fumadocs-core/toc'
import Link from 'next/link'

interface SitePageArticleProps {
  className?: string
  children?: React.ReactNode
}

interface SitePageArticleContentProps {
  className?: string
  children?: React.ReactNode
}

interface SitePageArticleSidebarProps {
  className?: string
  children?: React.ReactNode
}

interface SitePageArticleAuthorProps {
  className?: string
  children?: React.ReactNode
}

interface SitePageArticleAuthorTitleProps {
  className?: string
  children?: React.ReactNode
}

interface SitePageArticleAuthorAvatarProps {
  className?: string
  src?: string
  alt?: string
  fallback?: string
}

interface SitePageArticleAuthorLinkProps {
  className?: string
  children?: React.ReactNode
  href?: string
}

interface SitePageArticleAuthorInfoProps {
  className?: string
  children?: React.ReactNode
}

interface SitePageArticleAuthorNameProps {
  className?: string
  children?: React.ReactNode
}

interface SitePageArticleAuthorRoleProps {
  className?: string
  children?: React.ReactNode
}

const SitePageArticleAuthor = React.forwardRef<
  HTMLDivElement,
  SitePageArticleAuthorProps
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn('flex flex-col gap-y-4 pb-5', className)}
      {...props}
    >
      {children}
    </div>
  )
})
SitePageArticleAuthor.displayName = 'SitePageArticleAuthor'

const SitePageArticleAuthorTitle = React.forwardRef<
  HTMLParagraphElement,
  SitePageArticleAuthorTitleProps
>(({ className, children, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    >
      {children}
    </p>
  )
})
SitePageArticleAuthorTitle.displayName = 'SitePageArticleAuthorTitle'

const SitePageArticleAuthorLink = React.forwardRef<
  HTMLAnchorElement,
  SitePageArticleAuthorLinkProps
>(({ className, children, href, ...props }, ref) => {
  return (
    <a
      ref={ref}
      className={cn('group flex items-center space-x-3', className)}
      href={href}
      {...props}
    >
      {children}
    </a>
  )
})
SitePageArticleAuthorLink.displayName = 'SitePageArticleAuthorLink'

const SitePageArticleAuthorAvatar = React.forwardRef<
  HTMLDivElement,
  SitePageArticleAuthorAvatarProps
>(({ className, src, alt, fallback, ...props }, ref) => {
  return (
    <Avatar ref={ref} className={className} {...props}>
      <AvatarImage src={src} alt={alt} />
      <AvatarFallback>{fallback}</AvatarFallback>
    </Avatar>
  )
})
SitePageArticleAuthorAvatar.displayName = 'SitePageArticleAuthorAvatar'

const SitePageArticleAuthorInfo = React.forwardRef<
  HTMLDivElement,
  SitePageArticleAuthorInfoProps
>(({ className, children, ...props }, ref) => {
  return (
    <div ref={ref} className={cn('flex flex-col', className)} {...props}>
      {children}
    </div>
  )
})
SitePageArticleAuthorInfo.displayName = 'SitePageArticleAuthorInfo'

const SitePageArticleAuthorName = React.forwardRef<
  HTMLParagraphElement,
  SitePageArticleAuthorNameProps
>(({ className, children, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn('whitespace-nowrap text-sm font-medium', className)}
      {...props}
    >
      {children}
    </p>
  )
})
SitePageArticleAuthorName.displayName = 'SitePageArticleAuthorName'

const SitePageArticleAuthorRole = React.forwardRef<
  HTMLParagraphElement,
  SitePageArticleAuthorRoleProps
>(({ className, children, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn('text-sm text-neutral-500', className)}
      {...props}
    >
      {children}
    </p>
  )
})
SitePageArticleAuthorRole.displayName = 'SitePageArticleAuthorRole'

interface SitePageArticleTOCProps {
  className?: string
  items?: any[]
}

interface SitePageArticleRelatedProps {
  className?: string
  children?: React.ReactNode
}

interface SitePageArticleRelatedHeaderProps {
  className?: string
  children?: React.ReactNode
}

interface SitePageArticleRelatedListProps {
  className?: string
  children?: React.ReactNode
}

interface SitePageArticleRelatedItemProps {
  className?: string
  children?: React.ReactNode
  href?: string
}

// Root component
const SitePageArticle = React.forwardRef<HTMLDivElement, SitePageArticleProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('border-b space-y-8 lg:space-y-0', className)}
        {...props}
      >
        {children}
      </div>
    )
  },
)
SitePageArticle.displayName = 'SitePageArticle'

// Provider component
export const SitePageArticleProvider = ({
  toc,
  children,
}: AnchorProviderProps) => {
  return <AnchorProvider toc={toc}>{children}</AnchorProvider>
}

// Content component
const SitePageArticleContent = React.forwardRef<
  HTMLDivElement,
  SitePageArticleContentProps
>(({ className, children, ...props }, ref) => {
  return (
    <div ref={ref} className={cn('lg:border-l lg:pb-0', className)} {...props}>
      <article className="prose prose-sm prose-neutral dark:prose-invert px-4 py-6 lg:p-8">
        {children}
      </article>
    </div>
  )
})
SitePageArticleContent.displayName = 'SitePageArticleContent'

// Sidebar component
const SitePageArticleSidebar = React.forwardRef<
  HTMLElement,
  SitePageArticleSidebarProps
>(({ className, children, ...props }, ref) => {
  return (
    <aside
      ref={ref}
      className={cn(
        'hidden lg:block relative bg-secondary dark:bg-secondary/30 p-8 border-x border-b h-full',
        className,
      )}
      {...props}
    >
      <div className="sticky top-6">{children}</div>
    </aside>
  )
})
SitePageArticleSidebar.displayName = 'SitePageArticleSidebar'

// TOC component
const SitePageArticleTOC = React.forwardRef<
  HTMLDivElement,
  SitePageArticleTOCProps
>(({ className, items = [], ...props }, ref) => {
  return (
    <InlineTOC
      ref={ref}
      className={cn(
        'rounded-none border-none p-0 bg-transparent [&>button]:px-0 [&>button]:text-xs [&>div>div]:px-0 [&>div>div>a]:text-xs',
        className,
      )}
      title="On this page"
      defaultOpen
      items={items}
      {...props}
    />
  )
})
SitePageArticleTOC.displayName = 'SitePageArticleTOC'

// Related component
const SitePageArticleRelated = React.forwardRef<
  HTMLElement,
  SitePageArticleRelatedProps
>(({ className, children, ...props }, ref) => {
  return (
    <section
      ref={ref}
      className={cn('space-y-4 border-t', className)}
      {...props}
    >
      {children}
    </section>
  )
})
SitePageArticleRelated.displayName = 'SitePageArticleRelated'

const SitePageArticleRelatedHeader = React.forwardRef<
  HTMLElement,
  SitePageArticleRelatedHeaderProps
>(({ className, children, ...props }, ref) => {
  return (
    <header ref={ref} className={className} {...props}>
      {children || <p className="text-muted-foreground">Read More</p>}
    </header>
  )
})
SitePageArticleRelatedHeader.displayName = 'SitePageArticleRelatedHeader'

const SitePageArticleRelatedList = React.forwardRef<
  HTMLElement,
  SitePageArticleRelatedListProps
>(({ className, children, ...props }, ref) => {
  return (
    <main ref={ref} className={className} {...props}>
      <div className="rounded-md border divide-y">{children}</div>
    </main>
  )
})
SitePageArticleRelatedList.displayName = 'SitePageArticleRelatedList'

const SitePageArticleRelatedItem = React.forwardRef<
  HTMLAnchorElement,
  SitePageArticleRelatedItemProps
>(({ className, children, href, ...props }, ref) => {
  return (
    <Link
      ref={ref}
      href={href || '#'}
      className={cn(
        'flex items-center justify-between gap-4 px-4 py-4 hover:bg-secondary transition-colors no-underline',
        className,
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="size-4 text-muted-foreground" />
    </Link>
  )
})
SitePageArticleRelatedItem.displayName = 'SitePageArticleRelatedItem'

const SitePageArticleContainer = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'container mx-auto max-w-5xl gap-y-8 grid lg:gap-0 lg:grid-cols-[1fr_20rem]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
})
SitePageArticleContainer.displayName = 'SitePageArticleContainer'

export {
  SitePageArticle,
  SitePageArticleContent,
  SitePageArticleSidebar,
  SitePageArticleAuthor,
  SitePageArticleAuthorTitle,
  SitePageArticleAuthorLink,
  SitePageArticleAuthorAvatar,
  SitePageArticleAuthorInfo,
  SitePageArticleAuthorName,
  SitePageArticleAuthorRole,
  SitePageArticleTOC,
  SitePageArticleRelated,
  SitePageArticleRelatedHeader,
  SitePageArticleRelatedList,
  SitePageArticleRelatedItem,
  SitePageArticleContainer,
}
