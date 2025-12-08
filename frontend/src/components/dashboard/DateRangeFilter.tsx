import React from 'react'

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
    <div style={{ marginBottom: '24px' }}>
      <h3 style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: '#374151' }}>
        {label}
      </h3>
      {description && (
        <p style={{ marginBottom: '12px', fontSize: '12px', color: '#6B7280' }}>
          {description}
        </p>
      )}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1', minWidth: '200px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 500, color: '#374151' }}>
            Start Date
          </label>
          <input
            type="date"
            value={startDate || ''}
            onChange={(e) => onStartDateChange(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '14px',
              color: '#111827',
              backgroundColor: '#FFFFFF'
            }}
          />
        </div>
        <div style={{ flex: '1', minWidth: '200px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 500, color: '#374151' }}>
            End Date
          </label>
          <input
            type="date"
            value={endDate || ''}
            onChange={(e) => onEndDateChange(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '14px',
              color: '#111827',
              backgroundColor: '#FFFFFF'
            }}
          />
        </div>
      </div>
    </div>
  )
}

