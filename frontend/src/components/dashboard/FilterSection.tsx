import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface FilterSectionProps {
  children: ReactNode
  title?: string
  description?: string
}

export function FilterSection({
  children,
  title = 'Filters',
  description
}: FilterSectionProps) {
  return (
    <div className="mb-8 p-5 bg-gray-50 border border-gray-200 rounded-lg">
      <h3 className={cn(
        "text-base font-semibold text-gray-900",
        description ? "mb-2" : "mb-4"
      )}>
        {title}
      </h3>
      {description && (
        <p className="mb-4 text-sm text-gray-600">
          {description}
        </p>
      )}
      {children}
    </div>
  )
}

