'use client'

import { SerializableShowcase } from '../(lib)/showcase-utils'
import { ShowcaseCard } from './showcase-card'

interface ShowcaseGridProps {
  items: SerializableShowcase[]
}

export function ShowcaseGrid({ items }: ShowcaseGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item) => (
        <ShowcaseCard key={item.url} item={item} />
      ))}
    </div>
  )
}
