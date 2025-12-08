import React, { ReactNode } from 'react'

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
    <div style={{
      marginBottom: '32px',
      padding: '20px',
      backgroundColor: '#F9FAFB',
      border: '1px solid #E5E7EB',
      borderRadius: '8px'
    }}>
      <h3 style={{
        marginBottom: description ? '8px' : '16px',
        fontSize: '16px',
        fontWeight: 600,
        color: '#111827'
      }}>
        {title}
      </h3>
      {description && (
        <p style={{
          marginBottom: '16px',
          fontSize: '14px',
          color: '#6B7280'
        }}>
          {description}
        </p>
      )}
      {children}
    </div>
  )
}

