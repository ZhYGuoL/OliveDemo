import { useState } from 'react'
import './ConnectionForm.css'

interface ConnectionFormProps {
  type: 'postgresql' | 'supabase' | 'mysql'
  onConnect: (connectionString: string) => Promise<void>
  onCancel: () => void
}

export function ConnectionForm({ type, onConnect, onCancel }: ConnectionFormProps) {
  const [connectionString, setConnectionString] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await onConnect(connectionString.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect')
    } finally {
      setLoading(false)
    }
  }

  const getTitle = () => {
    switch (type) {
      case 'postgresql':
        return 'Add new PostgreSQL'
      case 'supabase':
        return 'Add new Supabase'
      case 'mysql':
        return 'Add new MySQL'
    }
  }

  const getIcon = () => {
    switch (type) {
      case 'postgresql':
        return '🐘'
      case 'supabase':
        return '⚡'
      case 'mysql':
        return '🐬'
    }
  }

  const getPlaceholder = () => {
    switch (type) {
      case 'postgresql':
        return 'postgresql://username:password@localhost:5432/database'
      case 'supabase':
        return 'postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres'
      case 'mysql':
        return 'mysql://username:password@localhost:3306/database'
    }
  }

  return (
    <div className="connection-form-overlay" onClick={onCancel}>
      <div className="connection-form-content" onClick={(e) => e.stopPropagation()}>
        <div className="connection-form-header">
          <div className="connection-form-title-group">
            <div className="connection-form-icon">{getIcon()}</div>
            <h2>{getTitle()}</h2>
          </div>
          <button className="connection-form-close" onClick={onCancel}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="connection-form">
          <div className="form-group">
            <label htmlFor="connectionString">Connection String</label>
            <input
              id="connectionString"
              type="text"
              value={connectionString}
              onChange={(e) => setConnectionString(e.target.value)}
              placeholder={getPlaceholder()}
              required
              disabled={loading}
              className="connection-string-input"
            />
          </div>

          {error && (
            <div className="form-error">
              {error}
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              onClick={onCancel}
              className="form-button back"
              disabled={loading}
            >
              Back
            </button>
            <button
              type="submit"
              className="form-button connect"
              disabled={loading || !connectionString.trim()}
            >
              {loading ? 'Connecting...' : 'Connect Database'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

