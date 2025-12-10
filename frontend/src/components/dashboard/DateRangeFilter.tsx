import React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface DateRangeFilterProps {
  startDate: string | null
  endDate: string | null
  onStartDateChange: (date: string) => void
  onEndDateChange: (date: string) => void
  label?: string
  description?: string
}

export function DateRangeFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  label = 'Date Range',
  description
}: DateRangeFilterProps) {
  return (
    <div className="mb-6">
      <h3 className="mb-2 text-sm font-semibold text-gray-700">
        {label}
      </h3>
      {description && (
        <p className="mb-3 text-xs text-gray-500">
          {description}
        </p>
      )}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] space-y-2">
          <Label htmlFor="start-date">Start Date</Label>
          <Input
            id="start-date"
            type="date"
            value={startDate || ''}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="flex-1 min-w-[200px] space-y-2">
          <Label htmlFor="end-date">End Date</Label>
          <Input
            id="end-date"
            type="date"
            value={endDate || ''}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="w-full"
          />
        </div>
      </div>
    </div>
  )
}

