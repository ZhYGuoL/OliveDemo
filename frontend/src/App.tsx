import { useState, useEffect } from 'react'
import './App.css'
import { DynamicDashboard } from './components/DynamicDashboard'
import { ChatSidebar } from './components/ChatSidebar'
import { DataSourceModal } from './components/DataSourceModal'
import { ConnectionForm } from './components/ConnectionForm'

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
  const [dbConnected, setDbConnected] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [chatHistory, setChatHistory] = useState<Array<{role: 'user' | 'assistant', content: string}>>([])
  const [chatInput, setChatInput] = useState('')
  const [showSQL, setShowSQL] = useState(false)
  const [showCode, setShowCode] = useState(false)
  const [showDataSourceModal, setShowDataSourceModal] = useState(false)
  const [showConnectionForm, setShowConnectionForm] = useState(false)
  const [selectedDataSource, setSelectedDataSource] = useState<'postgresql' | 'supabase' | 'mysql' | null>(null)
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
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = { detail: `Server error: ${response.status} ${response.statusText}` }
        }
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
      let errorMsg = 'An unexpected error occurred'
      if (err instanceof TypeError && err.message.includes('fetch')) {
        errorMsg = 'Failed to connect to backend server. Make sure the backend is running on http://localhost:8000'
      } else if (err instanceof Error) {
        errorMsg = err.message
      }
      setError(errorMsg)
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${errorMsg}`
      }])
    } finally {
      setLoading(false)
    }
  }

  // Check database connection status on mount
  useEffect(() => {
    checkDatabaseConnection()
  }, [])

  const checkDatabaseConnection = async () => {
    try {
      // Try to get schema to verify database connection
      const schemaResponse = await fetch('http://localhost:8000/schema')
      if (schemaResponse.ok) {
        const data = await schemaResponse.json()
        setDbConnected(data.connected || false)
      } else {
        setDbConnected(false)
      }
    } catch (err) {
      setDbConnected(false)
    }
  }

  const handleDataSourceSelect = (type: 'postgresql' | 'supabase' | 'mysql') => {
    setSelectedDataSource(type)
    setShowDataSourceModal(false)
    setShowConnectionForm(true)
  }

  const handleConnect = async (connectionString: string) => {
    // Create an AbortController for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout
    
    try {
      const response = await fetch('http://localhost:8000/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ database_url: connectionString }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to connect to database')
      }

      await response.json()
      
      // Verify connection by checking schema
      await checkDatabaseConnection()
      setShowConnectionForm(false)
      setSelectedDataSource(null)
      setError(null)
    } catch (err) {
      clearTimeout(timeoutId)
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Connection timeout. Please check your database is running and accessible.')
      }
      throw err
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
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = { detail: `Server error: ${response.status} ${response.statusText}` }
        }
        throw new Error(errorData.detail || 'Failed to generate dashboard')
      }

      const data: DashboardResponse = await response.json()
      setResult(data)
      setError(null) // Clear any previous errors
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: `I've updated the dashboard based on your request.`
      }])
    } catch (err) {
      let errorMsg = 'Failed to process request'
      if (err instanceof TypeError && err.message.includes('fetch')) {
        errorMsg = 'Failed to connect to backend server. Make sure the backend is running on http://localhost:8000'
      } else if (err instanceof Error) {
        errorMsg = err.message
      }
      setError(errorMsg)
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${errorMsg}`
      }])
    } finally {
      setLoading(false)
    }
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
              <div className="data-source-card" onClick={() => setShowDataSourceModal(true)}>
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
              <div className="data-source-card-collapsed" title="Data sources" onClick={() => setShowDataSourceModal(true)}>
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

      <DataSourceModal
        isOpen={showDataSourceModal}
        onClose={() => setShowDataSourceModal(false)}
        onSelect={handleDataSourceSelect}
      />

      {showConnectionForm && selectedDataSource && (
        <ConnectionForm
          type={selectedDataSource}
          onConnect={handleConnect}
          onCancel={() => {
            setShowConnectionForm(false)
            setSelectedDataSource(null)
          }}
        />
      )}

      <main className={`main-content ${showChat ? 'with-chat' : ''} ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <div className="content-shell">
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
                  <button 
                    className="connect-button"
                    onClick={() => setShowDataSourceModal(true)}
                  >
                    Connect a data source
                  </button>
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
              <div className="dashboard-header-bar">
                <div className="dashboard-header-left">
                  <h1 className="dashboard-header-title">Margin Insights Dashboard</h1>
                  <div className="dashboard-header-meta">
                    <span className="db-icon-small">🗄️</span>
                    <span className="dashboard-url">dashboard.com/dashboards/margin-insights</span>
                  </div>
                </div>
                <div className="dashboard-header-actions">
                  <button className="header-action-button" onClick={() => setShowSQL(!showSQL)}>
                    <span>Preview SQL</span>
                  </button>
                  <button className="header-action-icon" title="Code" onClick={() => setShowCode(!showCode)}>
                    <span>💻</span>
                  </button>
                  <button className="header-action-button primary">
                    <span>Share</span>
                  </button>
                </div>
              </div>
              
              <div className="dashboard-container">
                <DynamicDashboard
                  componentCode={result.reactComponent}
                  data={result.dataPreview}
                />
              </div>

              {showSQL && (
                <div className="result-panel">
                  <h2>Generated SQL</h2>
                  <pre className="code-block">
                    <code>{result.sql}</code>
                  </pre>
                </div>
              )}

              {showCode && (
                <div className="result-panel">
                  <h2>Component Code</h2>
                  <pre className="code-block">
                    <code>{result.reactComponent}</code>
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default App

