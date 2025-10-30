'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { CTASection } from './cta'

interface SitePageProps {
  className?: string
  children?: React.ReactNode
}

interface SitePageHeaderProps {
  className?: string
  children?: React.ReactNode
}

interface SitePageContentProps {
  className?: string
  children?: React.ReactNode
}

interface SitePageFooterProps {
  className?: string
  children?: React.ReactNode
}

// Container principal da página
const SitePage = React.forwardRef<HTMLDivElement, SitePageProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={cn('min-h-screen flex flex-col', className)}
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: {
            transition: {
              staggerChildren: 0.1,
              delayChildren: 0.1,
            },
          },
        }}
        {...props}
      >
        {children}
      </motion.div>
    )
  },
)
SitePage.displayName = 'SitePage'

// Header da página
const SitePageHeader = React.forwardRef<HTMLElement, SitePageHeaderProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <motion.header
        ref={ref}
        className={cn('', className)}
        variants={{
          hidden: { opacity: 0, y: 20 },
          visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5 },
          },
        }}
        {...props}
      >
        {children}
      </motion.header>
    )
  },
)
SitePageHeader.displayName = 'SitePageHeader'

// Conteúdo principal da página
const SitePageContent = React.forwardRef<HTMLElement, SitePageContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <motion.main
        ref={ref}
        className={cn('flex-1', className)}
        variants={{
          hidden: { opacity: 0, y: 20 },
          visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5, delay: 0.2 },
          },
        }}
        {...props}
      >
        {children}
      </motion.main>
    )
  },
)
SitePageContent.displayName = 'SitePageContent'

// Footer da página (inclui SiteCTA por padrão)
const SitePageFooter = React.forwardRef<HTMLElement, SitePageFooterProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <motion.footer
        ref={ref}
        className={cn('', className)}
        variants={{
          hidden: { opacity: 0, y: 20 },
          visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5, delay: 0.4 },
          },
        }}
        {...props}
      >
        {children || <CTASection />}
      </motion.footer>
    )
  },
)
SitePageFooter.displayName = 'SitePageFooter'

export { SitePage, SitePageHeader, SitePageContent, SitePageFooter }
