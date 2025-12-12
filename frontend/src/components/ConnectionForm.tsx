import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ConnectionFormProps {
  type: 'postgresql' | 'supabase' | 'mysql'
  isOpen: boolean
  onConnect: (connectionString: string) => Promise<void>
  onCancel: () => void
}

export function ConnectionForm({ type, isOpen, onConnect, onCancel }: ConnectionFormProps) {
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

  const getHelpText = () => {
    switch (type) {
      case 'postgresql':
        return 'Use localhost for local connections, or your IP address for remote access'
      case 'supabase':
        return 'Get your connection string from Supabase dashboard > Settings > Database'
      case 'mysql':
        return 'Use localhost for local connections, or your IP address for remote access'
      default:
        return ''
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{getIcon()}</span>
            {getTitle()}
          </DialogTitle>
          <DialogDescription>
            Enter your database connection string to connect securely.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="connectionString">Connection String</Label>
            <Input
              id="connectionString"
              type="text"
              value={connectionString}
              onChange={(e) => setConnectionString(e.target.value)}
              placeholder={getPlaceholder()}
              required
              disabled={loading}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {getHelpText()}
            </p>
            {type === 'postgresql' && connectionString.includes('localhost') && (
              <div className="text-xs text-muted-foreground mt-1 p-2 bg-muted rounded-md">
                <strong>Note:</strong> Using <code>localhost</code> means only this computer can access the database. 
                For remote access, replace <code>localhost</code> with your computer's IP address (e.g., <code>192.168.1.100</code>).
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              Back
            </Button>
            <Button
              type="submit"
              disabled={loading || !connectionString.trim()}
            >
              {loading ? 'Connecting...' : 'Connect Database'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

