import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChapterObjective {
  text: string
  completed?: boolean
}

interface ChapterObjectivesProps {
  objectives: ChapterObjective[]
  title?: string
  description?: string
}

export function ChapterObjectives({
  objectives,
  title = "In this chapter...",
  description = "Here are the topics we'll cover"
}: ChapterObjectivesProps) {
  return (
    <div className="my-8 rounded-lg border border-border bg-card overflow-hidden">
      <div className="p-3 border-b text-sm bg-background flex items-center space-x-2">
        <div>{title}</div>
        <div className="text-muted-foreground">{description}</div>
      </div>

      <div className="space-y-3 p-3">
        {objectives.map((objective, index) => (
          <div key={index} className="flex items-start space-x-2">
            <div
              className={cn(
                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                objective.completed
                  ? 'bg-green-500/10 text-green-500'
                  : 'bg-primary/10 text-primary'
              )}
            >
              <Check className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 text-sm leading-relaxed">{objective.text}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
