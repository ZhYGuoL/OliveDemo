import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface DataSourceModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (type: 'postgresql' | 'supabase' | 'mysql') => void
}

export function DataSourceModal({ isOpen, onClose, onSelect }: DataSourceModalProps) {
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Connect your first data source</DialogTitle>
          <DialogDescription>
            Choose a database to connect. We will securely access your data to help you build powerful tools.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 mt-4">
          {dataSources.map((source) => (
            <div
              key={source.type}
              className={cn(
                "p-6 border-2 rounded-lg cursor-pointer transition-all",
                "hover:border-primary hover:shadow-md",
                "bg-white border-gray-200"
              )}
              onClick={() => {
                onSelect(source.type)
                onClose()
              }}
            >
              <div className="text-4xl mb-2">{source.icon}</div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">
                {source.title}
              </h3>
              <p className="text-sm text-gray-600">
                {source.description}
              </p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

