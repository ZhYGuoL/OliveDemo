import React, { useRef, useEffect } from 'react'

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
    <div style={{ marginBottom: '24px' }}>
      <h3 style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: '#374151' }}>
        {label}
      </h3>
      {description && (
        <p style={{ marginBottom: '12px', fontSize: '12px', color: '#6B7280' }}>
          {description}
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {showSelectAll && (
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 0',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              color: '#111827'
            }}
          >
            <input
              type="checkbox"
              ref={selectAllRef}
              checked={allSelected}
              onChange={handleSelectAll}
              style={{
                marginRight: '8px',
                width: '16px',
                height: '16px',
                cursor: 'pointer'
              }}
            />
            Select All
          </label>
        )}
        {options.map((option) => (
          <label
            key={option.value}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '6px 0',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#374151'
            }}
          >
            <input
              type="checkbox"
              checked={selectedValues.includes(option.value)}
              onChange={() => handleOptionToggle(option.value)}
              style={{
                marginRight: '8px',
                width: '16px',
                height: '16px',
                cursor: 'pointer'
              }}
            />
            {option.label}
            {option.count !== undefined && (
              <span style={{ marginLeft: '8px', color: '#6B7280', fontSize: '12px' }}>
                ({option.count})
              </span>
            )}
          </label>
        ))}
      </div>
    </div>
  )
}

