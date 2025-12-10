import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ChartContainerProps {
  title: string
  subtitle?: string
  children: ReactNode
  height?: string | number
}

export function ChartContainer({
  title,
  subtitle,
  children,
  height = 'calc(100vh - 300px)' // Default to fill available space
}: ChartContainerProps) {
  return (
    <div className="mb-8 flex-1 flex flex-col min-h-0">
      <div className="mb-4">
        <h2 className={cn(
          "text-lg font-semibold text-gray-900",
          subtitle ? "mb-1" : "mb-0"
        )}>
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-gray-600 m-0">
            {subtitle}
          </p>
        )}
      </div>
      <div
        className="w-full flex-1 min-h-[400px] p-4 bg-white border border-gray-200 rounded-lg flex flex-col relative"
        style={{
          height: typeof height === 'number' ? `${height}px` : height,
        }}
      >
        {children}
      </div>
    </div>
  )
}

