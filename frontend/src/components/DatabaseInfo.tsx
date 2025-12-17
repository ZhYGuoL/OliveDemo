interface DatabaseInfoProps {
  databaseType: string | null
  databaseName: string | null
}

export function DatabaseInfo({ databaseType, databaseName }: DatabaseInfoProps) {
  const getIcon = (type: string | null) => {
    if (!type) return '🗄️'
    const t = type.toLowerCase()
    if (t.includes('postgres')) return '🐘'
    if (t.includes('mysql')) return '🐬'
    if (t.includes('supabase')) return '⚡'
    return '🗄️'
  }

  const getLabel = (type: string | null) => {
    if (!type) return 'Database'
    const t = type.toLowerCase()
    if (t.includes('postgres')) return 'PostgreSQL'
    if (t.includes('mysql')) return 'MySQL'
    if (t.includes('supabase')) return 'Supabase'
    return type
  }

  return (
    <div className="database-info-tag">
      <span className="db-icon">{getIcon(databaseType)}</span>
      <span className="db-name">{databaseName || getLabel(databaseType)}</span>
    </div>
  )
}
