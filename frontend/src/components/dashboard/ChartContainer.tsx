import React, { ReactNode } from 'react'

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
    <div style={{ marginBottom: '32px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ 
          marginBottom: subtitle ? '4px' : '0',
          fontSize: '18px',
          fontWeight: 600,
          color: '#111827'
        }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: '#6B7280'
          }}>
            {subtitle}
          </p>
        )}
      </div>
      <div style={{
        height: typeof height === 'number' ? `${height}px` : height,
        width: '100%',
        flex: 1,
        minHeight: '400px',
        padding: '16px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}>
        {children}
      </div>
    </div>
  )
}

