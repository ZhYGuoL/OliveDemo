import { useState } from 'react'
import './App.css'
import { DynamicDashboard } from './components/DynamicDashboard'
import { ChatSidebar } from './components/ChatSidebar'

interface DashboardResponse {
  sql: string
  reactComponent: string
  dataPreview: Record<string, any>[]
}

function App() {
  const [prompt, setPrompt] = useState('Build a table for me to see all my users.')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<DashboardResponse | null>(null)
  const [dbConnected] = useState(true) // For now, assume DB is connected
  const [showChat, setShowChat] = useState(false)
  const [chatHistory, setChatHistory] = useState<Array<{role: 'user' | 'assistant', content: string}>>([])
  const [chatInput, setChatInput] = useState('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return

    setLoading(true)
    setError(null)

    // Add user message to chat history
    const userMessage = prompt.trim()
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }])

    try {
      const response = await fetch('http://localhost:8000/generate_dashboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: userMessage }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to generate dashboard')
      }

      const data: DashboardResponse = await response.json()
      setResult(data)
      
      // Show chat sidebar after first successful query
      if (!showChat) {
        setShowChat(true)
      }
      
      // Add assistant response to chat
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: `I've generated a dashboard based on your request: "${userMessage}". The dashboard is displayed below.`
      }])
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMsg)
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${errorMsg}`
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleChatMessage = async (message: string) => {
    setLoading(true)
    setChatHistory(prev => [...prev, { role: 'user', content: message }])

    try {
      const response = await fetch('http://localhost:8000/generate_dashboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: message }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to generate dashboard')
      }

      const data: DashboardResponse = await response.json()
      setResult(data)
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: `I've updated the dashboard based on your request.`
      }])
    } catch (err) {
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${err instanceof Error ? err.message : 'Failed to process request'}`
      }])
    } finally {
      setLoading(false)
    }
  }

  const renderDataPreview = () => {
    if (!result || !result.dataPreview || result.dataPreview.length === 0) {
      return <p>No data to preview</p>
    }

    const columns = Object.keys(result.dataPreview[0])
    
    return (
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.dataPreview.map((row, idx) => (
            <tr key={idx}>
              {columns.map((col) => (
                <td key={col}>{String(row[col] ?? '')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  return (
    <div className="app">
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-circle">O</div>
          <button 
            className="sidebar-toggle" 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>
        
        {!sidebarCollapsed && (
          <>
            <button className="create-app-button">Create new app</button>
            
            <div className="sidebar-section">
              <div className="section-header">
                <span>APPS</span>
                <span className="section-icon">━</span>
              </div>
              <div className="section-content">No apps yet</div>
            </div>
            
            <div className="sidebar-section">
              <div className="section-header">
                <span>CONNECT</span>
              </div>
              <div className="data-source-card">
                <span className="data-source-icon">📊</span>
                <span>Data sources</span>
              </div>
            </div>
            
            <div className="sidebar-footer">
              <div className="user-profile">
                <div className="user-avatar">ZG</div>
                <div className="user-info">
                  <div className="user-name">Zhiyuan Guo</div>
                  <div className="user-org">
                    Peanuts Inc.
                    <span className="dropdown-arrow">▼</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
        
        {sidebarCollapsed && (
          <div className="sidebar-collapsed-content">
            <div className="sidebar-section">
              <div className="section-header-collapsed">
                <span className="section-icon">━</span>
              </div>
            </div>
            
            <div className="sidebar-section">
              <div className="data-source-card-collapsed" title="Data sources">
                <span className="data-source-icon">📊</span>
              </div>
            </div>
            
            <div className="sidebar-footer">
              <div className="user-profile-collapsed" title="Zhiyuan Guo - Peanuts Inc.">
                <div className="user-avatar">ZG</div>
              </div>
            </div>
          </div>
        )}
      </aside>

      {showChat && (
        <ChatSidebar
          isOpen={showChat}
          onClose={() => setShowChat(false)}
          onSendMessage={handleChatMessage}
          loading={loading}
          messages={chatHistory}
          input={chatInput}
          setInput={setChatInput}
          sidebarCollapsed={sidebarCollapsed}
        />
      )}

      <main className={`main-content ${showChat ? 'with-chat' : ''} ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {!result && (
          <>
            <div className="content-header">
              <h1>What can I build for you?</h1>
            </div>

            <form onSubmit={handleSubmit} className="prompt-form">
              <div className="prompt-input-wrapper">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Build a table for me to see all my users."
                  disabled={loading}
                  className="prompt-input-large"
                  rows={4}
                />
                <div className="prompt-meta">
                  <span className={`db-status ${dbConnected ? 'connected' : 'disconnected'}`}>
                    <span className="db-icon">🗄️</span>
                    {dbConnected ? 'DB Connected' : 'No DB Connected'}
                  </span>
                </div>
                <button
                  type="submit"
                  disabled={loading || !prompt.trim()}
                  className="submit-button"
                >
                  <span className="paper-plane">✈️</span>
                </button>
              </div>
            </form>

            {!dbConnected && (
              <div className="db-connect-box">
                <p className="db-connect-title">You haven't connected a database.</p>
                <p className="db-connect-description">To get started, connect a data source to generate tools from.</p>
                <button className="connect-button">Connect a data source</button>
              </div>
            )}
          </>
        )}

        {error && (
          <div className="error-box">
            <div className="error-message">{error}</div>
          </div>
        )}

        {result && (
          <div className="result-section">
            <div className="dashboard-container">
              <h2 className="dashboard-title">Dashboard</h2>
              <DynamicDashboard
                componentCode={result.reactComponent}
                data={result.dataPreview}
              />
            </div>

            <div className="result-panel">
              <h2>Generated SQL</h2>
              <pre className="code-block">
                <code>{result.sql}</code>
              </pre>
            </div>

            <div className="result-panel">
              <h2>Component Code</h2>
              <pre className="code-block">
                <code>{result.reactComponent}</code>
              </pre>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App

