'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '../ui/button'

interface QuizOption {
  label: string
  value: string
  isCorrect?: boolean
}

interface QuizProps {
  question: string
  options: QuizOption[]
  explanation?: string
}

export function Quiz({ question, options, explanation }: QuizProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [isAnswered, setIsAnswered] = useState(false)

  const handleCheck = () => {
    if (selectedOption) {
      setIsAnswered(true)
    }
  }

  const correctOption = options.find(opt => opt.isCorrect)
  const isCorrectAnswer = selectedOption === correctOption?.value

  return (
    <div className="my-8 rounded-lg border border-border bg-card overflow-hidden">
      <div className="font-medium text-foreground border-b bg-background p-3">{question}</div>

      <div className="space-y-2 p-3">
        {options.map((option, index) => {
          const optionLetter = String.fromCharCode(65 + index) // A, B, C, D...
          const isSelected = selectedOption === option.value
          const showCorrect = isAnswered && option.isCorrect
          const showIncorrect = isAnswered && isSelected && !option.isCorrect

          return (
            <button
              key={option.value}
              onClick={() => !isAnswered && setSelectedOption(option.value)}
              disabled={isAnswered}
              className={cn(
                'w-full rounded-lg border p-2 text-left transition-all',
                'hover:border-primary/50 disabled:cursor-not-allowed',
                isSelected && !isAnswered && 'border-primary bg-primary/5',
                showCorrect && 'border-green-500 bg-green-500/10',
                showIncorrect && 'border-red-500 bg-red-500/10',
                !isSelected && !showCorrect && 'border-border'
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                    isSelected && !isAnswered && 'bg-primary text-primary-foreground',
                    showCorrect && 'bg-green-500 text-white',
                    showIncorrect && 'bg-red-500 text-white',
                    !isSelected && !showCorrect && !showIncorrect && 'bg-muted text-muted-foreground'
                  )}
                >
                  {isAnswered ? (
                    showCorrect ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : showIncorrect ? (
                      <XCircle className="h-4 w-4" />
                    ) : (
                      optionLetter
                    )
                  ) : (
                    optionLetter
                  )}
                </span>
                <span className="flex-1">{option.label}</span>
              </div>
            </button>
          )
        })}
      </div>

      <div className='border-t p-3'>
        {!isAnswered && (
          <Button
            onClick={handleCheck}
            disabled={!selectedOption}
          >
            Check Answer
          </Button>
        )}

        {isAnswered && explanation && (
          <div
            className={cn(
              'rounded-lg border p-4',
              isCorrectAnswer
                ? 'border-green-500/50 bg-green-500/5'
                : 'border-red-500/50 bg-red-500/5'
            )}
          >
            <p className="text-sm font-medium">
              {isCorrectAnswer ? '✓ Correct!' : '✗ Incorrect'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{explanation}</p>
          </div>
        )}
      </div>
    </div>
  )
}
