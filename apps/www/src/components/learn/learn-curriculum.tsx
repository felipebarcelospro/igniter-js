import Link from 'next/link'
import { CheckCircle2, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LearnCurriculumProps {
  pages: any[] // Type from Fumadocs
}

export function LearnCurriculum({ pages }: LearnCurriculumProps) {
  // Sort pages by URL (which includes chapter numbers)
  const sortedPages = [...pages].sort((a, b) => {
    // Extract chapter number from URL (e.g., /learn/01-getting-started -> 01)
    const aMatch = a.url.match(/\/(\d+)-/)
    const bMatch = b.url.match(/\/(\d+)-/)
    
    const aNum = aMatch ? parseInt(aMatch[1]) : 0
    const bNum = bMatch ? parseInt(bMatch[1]) : 0
    
    return aNum - bNum
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-bold tracking-tight">What will I learn?</h2>
        <p className="text-muted-foreground">
          Here’s everything that’s covered in the course.
        </p>
      </div>

      <div className="grid">
        {sortedPages.map((page, index) => {
          const chapterNumber = index + 1
          const isFirst = index === 0

          return (
            <Link
              key={page.url}
              href={page.url}
              className={cn(
                'group relative overflow-hidden border border-border bg-card p-6 transition-all first:rounded-t-lg last:rounded-b-lg',
                'hover:border-border/50 hover:shadow-md'
              )}
            >
              <div className="flex items-center gap-4">
                {/* Chapter Number */}
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-background border font-bold text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  {chapterNumber}
                </div>

                {/* Content */}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold group-hover:text-primary transition-colors">
                      {page.data.title}
                    </h3>
                    {isFirst && (
                      <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-600 dark:text-green-400">
                        Start here
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {page.data.description}
                  </p>
                </div>

                {/* Arrow Icon */}
                <ArrowRight className="h-5 w-5" />
              </div>

              {/* Progress Indicator (placeholder for future implementation) */}
              <div className="absolute bottom-0 left-0 h-1 w-0 bg-primary transition-all group-hover:w-full" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
