import './DataSourceModal.css'

interface DataSourceModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (type: 'postgresql' | 'supabase' | 'mysql') => void
}

export function DataSourceModal({ isOpen, onClose, onSelect }: DataSourceModalProps) {
  if (!isOpen) return null

  const dataSources = [
    {
      type: 'postgresql' as const,
      title: 'Add new PostgreSQL',
      description: 'Connect to any PostgreSQL database with full feature support.',
      icon: '🐘'
    },
    {
      type: 'supabase' as const,
      title: 'Add new Supabase',
      description: 'Seamless integration with Supabase PostgreSQL databases.',
      icon: '⚡'
    },
    {
      type: 'mysql' as const,
      title: 'Add new MySQL',
      description: 'Connect to any MySQL database with full feature support.',
      icon: '🐬'
    }
  ]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Connect your first data source</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <p className="modal-description">
          Choose a database to connect. We will securely access your data to help you build powerful tools.
        </p>
        <div className="data-source-grid">
          {dataSources.map((source) => (
            <div
              key={source.type}
              className="data-source-card-modal"
              onClick={() => onSelect(source.type)}
            >
              <div className="data-source-icon-modal">{source.icon}</div>
              <h3>{source.title}</h3>
              <p>{source.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

