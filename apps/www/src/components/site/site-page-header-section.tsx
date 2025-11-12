'use client'

import * as React from 'react'
import { useId } from 'react'
import { motion } from 'framer-motion'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { cn } from '@/lib/utils'

interface HeaderSectionProps {
  className?: string
  children?: React.ReactNode
}

interface BreadcrumbItemProps {
  label: string
  href: string
  isActive: boolean
}

// Root: área do header, geralmente com fundo, borda, padding
const SitePageHeaderSection = React.forwardRef<HTMLElement, HeaderSectionProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <motion.header
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'relative border-b bg-background px-4 py-6 lg:pb-0',
          className,
        )}
        {...props}
      >
        {children}
      </motion.header>
    )
  },
)
SitePageHeaderSection.displayName = 'SitePageHeaderSection'

// Container: centraliza e organiza o conteúdo (grid/flex)
const SitePageHeaderSectionContainer = React.forwardRef<
  HTMLDivElement,
  HeaderSectionProps
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'container mx-auto max-w-5xl flex flex-col',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
})
SitePageHeaderSectionContainer.displayName = 'SitePageHeaderSectionContainer'

// Breadcrumb: navegação
const SitePageHeaderSectionBreadcrumb = React.forwardRef<
  HTMLDivElement,
  HeaderSectionProps & { items: Array<BreadcrumbItemProps> }
>(({ className, items, ...props }, ref) => {
  return (
    <div ref={ref} className={cn('mb-16', className)} {...props}>
      <Breadcrumb className="mb-8">
        <BreadcrumbList>
          {items.map((item, index) => (
            <React.Fragment key={item.href}>
              <BreadcrumbItem>
                <BreadcrumbLink
                  href={item.href}
                  className={
                    item.isActive ? 'text-foreground' : 'text-muted-foreground'
                  }
                >
                  {item.label}
                </BreadcrumbLink>
              </BreadcrumbItem>
              {index < items.length - 1 && <BreadcrumbSeparator />}
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  )
})
SitePageHeaderSectionBreadcrumb.displayName = 'SitePageHeaderSectionBreadcrumb'

// Content: título e descrição
const SitePageHeaderSectionContent = React.forwardRef<
  HTMLDivElement,
  HeaderSectionProps
>(({ className, children, ...props }, ref) => {
  return (
    <div ref={ref} className={cn('flex-1 pb-12', className)} {...props}>
      {children}
    </div>
  )
})
SitePageHeaderSectionContent.displayName = 'SitePageHeaderSectionContent'

const SitePageHeaderSectionTitle = React.forwardRef<
  HTMLHeadingElement,
  HeaderSectionProps
>(({ className, children, ...props }, ref) => {
  return (
    <h1
      ref={ref}
      className={cn('text-lg font-bold leading-tight', className)}
      {...props}
    >
      {children}
    </h1>
  )
})
SitePageHeaderSectionTitle.displayName = 'SitePageHeaderSectionTitle'

const SitePageHeaderSectionDescription = React.forwardRef<
  HTMLDivElement,
  HeaderSectionProps
>(({ className, children, ...props }, ref) => {
  if (!children) return null

  return (
    <div
      ref={ref}
      className={cn('text-muted-foreground', className)}
      {...props}
    >
      {children}
    </div>
  )
})
SitePageHeaderSectionDescription.displayName =
  'SitePageHeaderSectionDescription'

// Actions: botões, links
const SitePageHeaderSectionActions = React.forwardRef<
  HTMLDivElement,
  HeaderSectionProps
>(({ className, children, ...props }, ref) => {
  return (
    <div ref={ref} className={cn('flex gap-2 mt-8', className)} {...props}>
      {children}
    </div>
  )
})
SitePageHeaderSectionActions.displayName = 'SitePageHeaderSectionActions'

// Suffix: área à direita (ícones, badges, etc)
const SitePageHeaderSectionSuffix = React.forwardRef<
  HTMLDivElement,
  HeaderSectionProps
>(({ className, children, ...props }, ref) => {
  return (
    <div ref={ref} className={cn('ml-auto', className)} {...props}>
      {children}
    </div>
  )
})
SitePageHeaderSectionSuffix.displayName = 'SitePageHeaderSectionSuffix'

const SitePageHeaderSectionGradient = React.forwardRef<
  HTMLDivElement,
  HeaderSectionProps
>((props, ref) => {
  const id = useId()
  return (
    <div
      ref={ref}
      className="opacity-5 pointer-events-none absolute inset-x-px inset-y-0 overflow-hidden [mask-image:linear-gradient(transparent,black)]"
      {...props}
    >
      <svg
        className="pointer-events-none absolute inset-[unset] bottom-0 left-1/2 h-[600px] -translate-x-1/2 text-grid-border/60"
        width="100%"
        height="100%"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <pattern
            id={`grid-${id}`}
            x="-3"
            y="12"
            width="49.6"
            height="49.6"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 49.6 0 L 0 0 0 49.6"
              fill="transparent"
              stroke="currentColor"
              strokeWidth="2"
            ></path>
          </pattern>
        </defs>
        <rect fill={`url(#grid-${id})`} width="100%" height="100%"></rect>
      </svg>
    </div>
  )
})

SitePageHeaderSectionGradient.displayName = 'SitePageHeaderSectionGradient'
export {
  SitePageHeaderSection,
  SitePageHeaderSectionContainer,
  SitePageHeaderSectionBreadcrumb,
  SitePageHeaderSectionContent,
  SitePageHeaderSectionTitle,
  SitePageHeaderSectionDescription,
  SitePageHeaderSectionActions,
  SitePageHeaderSectionSuffix,
  SitePageHeaderSectionGradient,
}
