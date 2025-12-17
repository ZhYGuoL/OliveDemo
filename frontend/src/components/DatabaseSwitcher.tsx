import { useState, useEffect, useRef } from 'react'
import './DatabaseSwitcher.css'
import { apiEndpoint } from '../config'

interface DatabaseConnection {
  id: string
  url: string
  name: string
}

interface DatabaseSwitcherProps {
  currentDatabaseName: string | null
  currentDatabaseType: string | null
  onSwitch: () => void
  onAdd: () => void
}

export function DatabaseSwitcher({ 
  currentDatabaseName, 
  currentDatabaseType, 
  onSwitch,
  onAdd 
}: DatabaseSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [connections, setConnections] = useState<DatabaseConnection[]>([])
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchConnections()
  }, [])

  useEffect(() => {
    // Close dropdown when clicking outside
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchConnections = async () => {
    try {
      const response = await fetch(apiEndpoint('connections'))
      if (response.ok) {
        const data = await response.json()
        setConnections(data.connections || [])
      }
    } catch (err) {
      console.error('Failed to fetch connections', err)
    }
  }

  const handleSwitch = async (id: string) => {
    try {
      const response = await fetch(apiEndpoint('switch_connection'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })
      
      if (response.ok) {
        setIsOpen(false)
        onSwitch()
      }
    } catch (err) {
      console.error('Failed to switch connection', err)
    }
  }

  const getIcon = (type: string | null) => {
    if (!type) return '🗄️'
    const t = type.toLowerCase()
    if (t.includes('postgres')) return '🐘'
    if (t.includes('mysql')) return '🐬'
    if (t.includes('supabase')) return '⚡'
    return '🗄️'
  }

  return (
    <div className="database-switcher" ref={dropdownRef}>
      <button 
        className={`switcher-button ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Switch database"
      >
        <span className="db-icon">{getIcon(currentDatabaseType)}</span>
        <span className="db-name">{currentDatabaseName || 'Unknown Database'}</span>
        <span className="switcher-arrow">▼</span>
      </button>

      {isOpen && (
        <div className="switcher-dropdown">
          <div className="switcher-list">
            {connections.map((conn) => (
              <button
                key={conn.id}
                className={`switcher-item ${conn.name === currentDatabaseName ? 'active' : ''}`}
                onClick={() => handleSwitch(conn.id)}
              >
                <span className="db-icon-small">🗄️</span>
                <span className="switcher-item-name">{conn.name}</span>
                {conn.name === currentDatabaseName && <span className="check-icon">✓</span>}
              </button>
            ))}
          </div>
          
          <div className="switcher-divider"></div>
          
          <button 
            className="add-source-button"
            onClick={() => {
              setIsOpen(false)
              onAdd()
            }}
          >
            <span className="plus-icon">+</span>
            Add new data source
          </button>
        </div>
      )}
    </div>
  )
}

