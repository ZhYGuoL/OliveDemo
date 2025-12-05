import { useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatSidebarProps {
  isOpen: boolean
  onClose: () => void
  onSendMessage: (message: string) => Promise<void>
  loading: boolean
  messages: Message[]
  input: string
  setInput: (value: string) => void
  sidebarCollapsed: boolean
}

export function ChatSidebar({ isOpen, onClose, onSendMessage, loading, messages, input, setInput, sidebarCollapsed }: ChatSidebarProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    await onSendMessage(userMessage)
  }

  return (
    <aside className={`chat-sidebar ${isOpen ? 'open' : ''} ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="chat-header">
        <h2>Chat</h2>
        <button className="chat-close" onClick={onClose}>×</button>
      </div>
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p>Start a conversation to refine your dashboard</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={`chat-message ${msg.role}`}>
            <div className="message-content">{msg.content}</div>
          </div>
        ))}
        {loading && (
          <div className="chat-message assistant">
            <div className="message-content">Generating...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="chat-input-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a follow-up question..."
          disabled={loading}
          className="chat-input"
        />
        <button type="submit" disabled={loading || !input.trim()} className="chat-send">
          →
        </button>
      </form>
    </aside>
  )
}

