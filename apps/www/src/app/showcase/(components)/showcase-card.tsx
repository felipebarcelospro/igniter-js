'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import type { SerializableShowcase } from '../(lib)/showcase-utils'

interface ShowcaseCardProps {
  item: SerializableShowcase
}

export function ShowcaseCard({ item }: ShowcaseCardProps) {
  const imageUrl = item.image || '/placeholder-showcase.png'
  const [isHovered, setIsHovered] = useState(false)
  const imageRef = useRef<HTMLImageElement>(null)

  const handleMouseEnter = () => {
    setIsHovered(true)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    // Reset image position smoothly when mouse leaves
    if (imageRef.current) {
      imageRef.current.style.transform = 'translateY(0)'
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current || !isHovered) return

    const container = e.currentTarget
    const rect = container.getBoundingClientRect()
    const mouseY = e.clientY - rect.top
    const percentage = mouseY / rect.height

    // Image is 200% height, so we can scroll from 0 to 100% of the container height
    // This creates a smooth scroll effect from top to bottom
    const maxScroll = rect.height // The amount we can scroll (from top to bottom of visible area)
    const scrollPosition = percentage * maxScroll

    imageRef.current.style.transform = `translateY(-${scrollPosition}px)`
  }

  return (
    <Link
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block space-y-3"
    >
      {/* Project Image */}
      <div
        className="relative overflow-hidden rounded-lg border border-border bg-muted transition-colors hover:border-primary/50 aspect-video"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
      >
        <img
          ref={imageRef}
          src={imageUrl}
          alt={item.title}
          className="absolute top-0 left-0 w-full h-[200%] object-cover object-top transition-transform duration-300 ease-out"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
      </div>

      {/* Project Title */}
      <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
        {item.title}
      </p>
    </Link>
  )
}
