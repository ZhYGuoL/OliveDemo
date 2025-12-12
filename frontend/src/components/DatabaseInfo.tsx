import React from 'react'

interface DatabaseInfoProps {
  databaseType: string | null
  databaseName: string | null
}

const getDatabaseIcon = (type: string | null): string => {
  switch (type) {
    case 'PostgreSQL':
      return '🐘'
    case 'Supabase':
      return '⚡'
    case 'MySQL':
      return '🐬'
    default:
      return '🗄️'
  }
}

const getDatabaseColor = (type: string | null): string => {
  switch (type) {
    case 'PostgreSQL':
      return '#336791'
    case 'Supabase':
      return '#3ECF8E'
    case 'MySQL':
      return '#00758F'
    default:
      return '#6b7280'
  }
}

export const DatabaseInfo: React.FC<DatabaseInfoProps> = ({ databaseType, databaseName }) => {
  if (!databaseType) return null

  return (
    <div 
      className="database-info"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.4rem 0.75rem',
        borderRadius: '20px',
        fontSize: '0.8rem',
        fontWeight: 500,
        backgroundColor: '#d1fae5',
        color: '#065f46',
        border: `1px solid ${getDatabaseColor(databaseType)}`,
      }}
    >
      <span style={{ fontSize: '0.9rem' }}>{getDatabaseIcon(databaseType)}</span>
      <span>{databaseType}</span>
      {databaseName && (
        <>
          <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>•</span>
          <span style={{ color: '#6b7280', fontWeight: 400 }}>{databaseName}</span>
        </>
      )}
    </div>
  )
}

