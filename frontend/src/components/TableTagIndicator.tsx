import React, { useState, useEffect } from 'react'

interface TableTagProps {
  prompt: string
  availableTables?: string[]
}

export const TableTagIndicator: React.FC<TableTagProps> = ({ prompt, availableTables = [] }) => {
  const [taggedTables, setTaggedTables] = useState<string[]>([])

  useEffect(() => {
    // Parse @table_name references from prompt
    const pattern = /@(\w+)/gi
    const matches = prompt.match(pattern) || []
    const tables = matches.map(match => match.substring(1).toLowerCase())
    setTaggedTables([...new Set(tables)])
  }, [prompt])

  if (taggedTables.length === 0) return null

  return (
    <div className="table-tags-indicator">
      <span className="table-tags-label">Referenced tables:</span>
      {taggedTables.map((table, idx) => (
        <span key={idx} className="table-tag">
          @{table}
        </span>
      ))}
      {availableTables.length > 0 && (
        <span className="table-tags-hint">
          Available: {availableTables.slice(0, 5).join(', ')}
          {availableTables.length > 5 && ` +${availableTables.length - 5} more`}
        </span>
      )}
    </div>
  )
}

