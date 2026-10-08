'use client'

import { useRef, useState, type MouseEvent } from 'react'
import Link from 'next/link'
import type { SerializableShowcase } from '../(lib)/showcase-utils'

interface ShowcaseCardProps {
  item: SerializableShowcase
}

export function ShowcaseCard({ item }: ShowcaseCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const imageRef = useRef<HTMLImageElement>(null)

  const handleMouseLeave = () => {
    setIsHovered(false)
    if (imageRef.current) imageRef.current.style.transform = 'translateY(0)'
  }

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current || !isHovered) return

    const rect = event.currentTarget.getBoundingClientRect()
    const percentage = (event.clientY - rect.top) / rect.height
    const maxScroll = Math.max(imageRef.current.clientHeight - rect.height, 0)
    imageRef.current.style.transform = `translateY(-${percentage * maxScroll}px)`
  }

  return (
    <article className="group space-y-3">
      <Link
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Visit ${item.title}`}
        className="block"
      >
        <div
          className="relative aspect-video overflow-hidden rounded-lg border border-border bg-muted transition-colors hover:border-primary/50"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={handleMouseLeave}
          onMouseMove={handleMouseMove}
        >
          <img
            ref={imageRef}
            src={item.image || '/placeholder-showcase.png'}
            alt={`${item.title} full-page screenshot`}
            className="absolute left-0 top-0 block h-auto w-full object-top transition-transform duration-300 ease-out"
            onError={(event) => {
              event.currentTarget.style.display = 'none'
            }}
          />
        </div>
      </Link>

      <Link
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-sm font-medium text-foreground transition-colors group-hover:text-primary"
      >
        {item.title}
      </Link>
    </article>
  )
}
