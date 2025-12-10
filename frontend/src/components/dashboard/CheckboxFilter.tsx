import React, { useRef, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface CheckboxOption {
  value: string
  label: string
  count?: number
}

interface CheckboxFilterProps {
  options: CheckboxOption[]
  selectedValues: string[]
  onSelectionChange: (selectedValues: string[]) => void
  label?: string
  description?: string
  showSelectAll?: boolean
}

export function CheckboxFilter({
  options,
  selectedValues,
  onSelectionChange,
  label = 'Filters',
  description,
  showSelectAll = true
}: CheckboxFilterProps) {
  const allSelected = options.length > 0 && selectedValues.length === options.length
  const someSelected = selectedValues.length > 0 && selectedValues.length < options.length
  const selectAllRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected
    }
  }, [someSelected])

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([])
    } else {
      onSelectionChange(options.map(opt => opt.value))
    }
  }

  const handleOptionToggle = (value: string) => {
    if (selectedValues.includes(value)) {
      onSelectionChange(selectedValues.filter(v => v !== value))
    } else {
      onSelectionChange([...selectedValues, value])
    }
  }

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
      <div className="flex flex-col gap-2">
        {showSelectAll && (
          <Label className="flex items-center py-2 cursor-pointer font-medium">
            <input
              type="checkbox"
              ref={selectAllRef}
              checked={allSelected}
              onChange={handleSelectAll}
              className="mr-2 w-4 h-4 cursor-pointer"
            />
            Select All
          </Label>
        )}
        {options.map((option) => (
          <Label
            key={option.value}
            className="flex items-center py-1.5 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selectedValues.includes(option.value)}
              onChange={() => handleOptionToggle(option.value)}
              className="mr-2 w-4 h-4 cursor-pointer"
            />
            {option.label}
            {option.count !== undefined && (
              <span className="ml-2 text-xs text-gray-500">
                ({option.count})
              </span>
            )}
          </Label>
        ))}
      </div>
    </div>
  )
}

