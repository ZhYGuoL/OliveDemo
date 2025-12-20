import { useState, useEffect } from 'react'
import './App.css'
import { SchemaRenderer } from './components/SchemaRenderer'
import { ChatSidebar } from './components/ChatSidebar'
import { DataSourceModal } from './components/DataSourceModal'
import { ConnectionForm } from './components/ConnectionForm'
import { DatabaseSwitcher } from './components/DatabaseSwitcher'
import { PromptEditor } from './components/tiptap/PromptEditor'
import { DashboardSuggestions } from './components/DashboardSuggestions'
import { apiEndpoint } from './config'
import { DashboardSpec } from './types/dashboard'
import { ToastProvider, useToast } from './components/ui/ToastContext'

interface DashboardResponse {
  spec: DashboardSpec
  data: Record<string, any[]>
}

interface DashboardSnapshot {
  id: string
  prompt: string
  result: DashboardResponse
  createdAt: string
}

interface ChatSession {
  id: string
  title: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  result: DashboardResponse | null
  dashboards: DashboardSnapshot[]
  createdAt: string
  updatedAt: string
}

function AppContent() {
  const [prompt, setPrompt] = useState('Build a table for me to see all my users.')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<DashboardResponse | null>(null)
  const [dbConnected, setDbConnected] = useState(false)
  const [databaseType, setDatabaseType] = useState<string | null>(null)
  const [databaseName, setDatabaseName] = useState<string | null>(null)
  const [availableTables, setAvailableTables] = useState<string[]>([])
  const [showChat, setShowChat] = useState(false)
  const [chatHistory, setChatHistory] = useState<Array<{role: 'user' | 'assistant', content: string}>>([])
  const [chatInput, setChatInput] = useState('')
  const [showJSON, setShowJSON] = useState(false)
  const [showSQL, setShowSQL] = useState(false)
  const [showDataSourceModal, setShowDataSourceModal] = useState(false)
  const [showConnectionForm, setShowConnectionForm] = useState(false)
  const [selectedDataSource, setSelectedDataSource] = useState<'postgresql' | 'supabase' | 'mysql' | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const { toast, dismiss } = useToast()

  const LOCAL_STORAGE_KEY = 'chatSessions'
  const MAX_SESSIONS = 20
  const MAX_ROWS_PER_SOURCE = 200

  const trimResult = (result: DashboardResponse | null): DashboardResponse | null => {
    if (!result) return null
    const trimmedData = Object.fromEntries(
      Object.entries(result.data || {}).map(([k, v]) => [
        k,
        Array.isArray(v) ? v.slice(0, MAX_ROWS_PER_SOURCE) : v,
      ])
    )
    return { ...result, data: trimmedData }
  }

  const normalizeMessages = (messages: any[]) =>
    (messages || []).map((m) => ({
      role: m?.role === 'assistant' ? 'assistant' as const : 'user' as const,
      content: typeof m?.content === 'string' ? m.content : '',
    }))

  const normalizeSession = (session: any): ChatSession => {
    const now = new Date().toISOString()
    const normalizedResult = trimResult(session?.result ?? null)
    const dashboardsRaw = Array.isArray(session?.dashboards) ? session.dashboards : []
    const dashboards: DashboardSnapshot[] = dashboardsRaw
      .map((d: any) => ({
        id: String(d?.id ?? `dash-${Date.now()}`),
        prompt: typeof d?.prompt === 'string' ? d.prompt : '',
        result: trimResult(d?.result) ?? null,
        createdAt: typeof d?.createdAt === 'string' ? d.createdAt : now,
      }))
      .filter((d: DashboardSnapshot | null) => d?.result !== null) as DashboardSnapshot[]

    // Backfill a single dashboard from legacy result if none exist
    if (dashboards.length === 0 && normalizedResult) {
      dashboards.push({
        id: `dash-${Date.now()}`,
        prompt: typeof session?.title === 'string' ? session.title : 'Dashboard',
        result: normalizedResult,
        createdAt: now,
      })
    }

    return {
      id: String(session?.id ?? `chat-${Date.now()}`),
      title: typeof session?.title === 'string' ? session.title : 'Chat',
      messages: normalizeMessages(session?.messages ?? []),
      result: normalizedResult,
      dashboards,
      createdAt: typeof session?.createdAt === 'string' ? session.createdAt : now,
      updatedAt: typeof session?.updatedAt === 'string' ? session.updatedAt : now,
    }
  }

  // Load saved sessions on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (stored) {
        const parsedRaw = JSON.parse(stored)
        const parsed: ChatSession[] = Array.isArray(parsedRaw)
          ? parsedRaw.map(normalizeSession)
          : []
        setChatSessions(parsed)
        if (parsed.length > 0) {
          const latest = parsed[0]
          setActiveSessionId(latest.id)
          setChatHistory(latest.messages)
          setResult(latest.result)
          setShowChat(latest.messages.length > 0)
        }
      }
    } catch {
      // ignore load errors
    }
  }, [])

  // Persist sessions
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(chatSessions))
    } catch (e) {
      // storage might fail (quota); ignore persist errors
      console.warn('Failed to persist chat sessions', e)
    }
  }, [chatSessions])

  const findSession = (id: string | null) => chatSessions.find(s => s.id === id)

  const upsertSession = (session: ChatSession) => {
    setChatSessions(prev => {
      const idx = prev.findIndex(s => s.id === session.id)
      const updated = idx >= 0 ? [...prev.slice(0, idx), session, ...prev.slice(idx + 1)] : [session, ...prev]
      // keep most recent updated first and limit count
      const sorted = updated.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
      return sorted.slice(0, MAX_SESSIONS)
    })
  }

  const createSession = (title: string) => {
    const now = new Date().toISOString()
    const id = `chat-${Date.now()}`
    const session: ChatSession = {
      id,
      title,
      messages: [],
      result: null,
      dashboards: [],
      createdAt: now,
      updatedAt: now
    }
    setActiveSessionId(id)
    setChatHistory([])
    setResult(null)
    setShowChat(false)
    setChatSessions(prev => [session, ...prev])
    return session
  }

  const startNewChat = () => {
    const session = createSession('New chat')
    setActiveSessionId(session.id)
    setPrompt('Build a table for me to see all my users.')
    setChatInput('')
    setChatHistory([])
    setResult(null)
    setShowChat(false)
  }

  const selectSession = (id: string) => {
    const session = findSession(id)
    if (!session) return
    setActiveSessionId(id)
    setChatHistory(session.messages)
    const latestDash = session.dashboards[session.dashboards.length - 1]
    setResult(latestDash ? latestDash.result : session.result)
    setShowChat(session.messages.length > 0)
    setPrompt('Build a table for me to see all my users.')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // TipTap returns plain text with @mentions already formatted as "@tablename"
    // No special regex cleaning needed for react-mentions markup
    const cleanPrompt = prompt.trim()
    
    if (!cleanPrompt) return

    setLoading(true)
    setError(null)

    const userMessage = cleanPrompt
    let sessionMaybe = findSession(activeSessionId)
    if (!sessionMaybe) {
      sessionMaybe = createSession(userMessage.slice(0, 40) || 'New chat')
    }
    const session: ChatSession = sessionMaybe

    const userMessages: ChatSession['messages'] = [...session.messages, { role: 'user' as const, content: userMessage }]
    const updatedSession: ChatSession = {
      ...session,
      messages: userMessages,
      updatedAt: new Date().toISOString(),
    }
    upsertSession(updatedSession)
    setChatHistory(userMessages)
    setActiveSessionId(updatedSession.id)

    try {
      const response = await fetch(apiEndpoint('generate_dashboard'), {
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
      console.log('[App handleSubmit] Received data from API:', data);
      console.log('[App handleSubmit] Data sources:', Object.keys(data.data), 'with lengths:', Object.entries(data.data).map(([k, v]) => `${k}: ${v?.length ?? 0}`));

      // Merge new widgets and data sources with existing result if available
      if (result && result.spec) {
        // Create new widget IDs to avoid collisions if necessary (though LLM should generate unique ones in ideal world)
        // For now, we'll append.
        
        // We need to merge the specs intelligently
        // Filter out existing widgets if IDs clash (though rare with sequential prompts)
        const existingWidgetIds = new Set(result.spec.widgets.map(w => w.id))
        const newWidgets = data.spec.widgets.filter(w => !existingWidgetIds.has(w.id))
        
        const mergedSpec: DashboardSpec = {
          ...result.spec,
          widgets: [...result.spec.widgets, ...newWidgets],
          dataSources: [...result.spec.dataSources, ...data.spec.dataSources] // We can optimize this by deduplicating sources too
        }
        
        // Merge data: Preserve existing data, add new data sources
        // Important: If a data source ID exists in both, the new one overwrites (assuming it might be a refresh)
        // But for "add new component", we generally expect new source IDs or reuse of existing ones.
        // If the new request generated a source with same ID but no data (empty list), we should prefer the existing data if valid.
        
        const mergedData = { ...result.data }
        Object.entries(data.data).forEach(([key, value]) => {
           // If we already have data for this key and the new data is empty, keep the old one.
           // Otherwise, update it.
           if (mergedData[key] && (!value || value.length === 0)) {
             return; 
           }
           mergedData[key] = value
        })
        
        const mergedResult = {
          spec: mergedSpec,
          data: mergedData
        }
        
        setResult(mergedResult)
        
        // Update session with merged result
        const assistantMessage: ChatSession['messages'][number] = {
          role: 'assistant',
          content: `I've added the new components to your dashboard based on your request: "${userMessage}".`
        }
        const finalMessages: ChatSession['messages'] = [...userMessages, assistantMessage]
        setChatHistory(finalMessages)
        const finalSession: ChatSession = {
          ...updatedSession,
          messages: finalMessages,
          result: mergedResult,
          updatedAt: new Date().toISOString()
        }
        upsertSession(finalSession)
      } else {
        // First query, just set the result
        setResult(data)
        
        if (!showChat) {
          setShowChat(true)
        }
        
      const assistantMessage: ChatSession['messages'][number] = {
          role: 'assistant',
          content: `I've generated a dashboard based on your request: "${userMessage}".`
        }
        const finalMessages: ChatSession['messages'] = [...userMessages, assistantMessage]
        setChatHistory(finalMessages)
      const dashboardSnapshot: DashboardSnapshot = {
        id: `dash-${Date.now()}`,
        prompt: userMessage,
        result: trimResult(data)!,
        createdAt: new Date().toISOString(),
      }
      const finalSession: ChatSession = {
          ...updatedSession,
          messages: finalMessages,
        result: trimResult(data),
        dashboards: [...updatedSession.dashboards, dashboardSnapshot].slice(0, MAX_SESSIONS),
          updatedAt: new Date().toISOString()
        }
        upsertSession(finalSession)
      }
    } catch (err) {
      let errorMsg = 'An unexpected error occurred'
      if (err instanceof TypeError && err.message.includes('fetch')) {
        errorMsg = `Failed to connect to backend server. Make sure the backend is running on ${apiEndpoint('')}`
      } else if (err instanceof Error) {
        errorMsg = err.message
      }
      setError(errorMsg)
      const assistantMessage: ChatSession['messages'][number] = {
        role: 'assistant',
        content: `Error: ${errorMsg}`
      }
      const errorMessages: ChatSession['messages'] = [...userMessages, assistantMessage]
      setChatHistory(errorMessages)
      const finalSession: ChatSession = {
        ...updatedSession,
        messages: errorMessages,
        dashboards: updatedSession.dashboards,
        result: trimResult(result),
        updatedAt: new Date().toISOString()
      }
      upsertSession(finalSession)
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
      const schemaResponse = await fetch(apiEndpoint('schema'))
      if (schemaResponse.ok) {
        const data = await schemaResponse.json()
        setDbConnected(data.connected || false)
        setDatabaseType(data.database_type || null)
        setDatabaseName(data.database_name || null)
        const tables = data.tables || []
        console.log('Available tables loaded:', tables)
        setAvailableTables(tables)
      } else {
        setDbConnected(false)
        setDatabaseType(null)
        setDatabaseName(null)
        setAvailableTables([])
      }
    } catch (err) {
      setDbConnected(false)
      setDatabaseType(null)
      setDatabaseName(null)
      setAvailableTables([])
    }
  }

// 
  const handleDataSourceSelect = (type: 'postgresql' | 'supabase' | 'mysql') => {
    setSelectedDataSource(type)
    setShowDataSourceModal(false)
    setShowConnectionForm(true)
  }

  const handleConnect = async (connectionString: string) => {
    // Immediately close modal and reset selection
    setShowConnectionForm(false)
    setSelectedDataSource(null)
    
    // Show loading toast
    const loadingToastId = toast("Connecting to database...", "loading", 0)
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // Increased timeout for background process
    
    try {
      const response = await fetch(apiEndpoint('connect'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ database_url: connectionString }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      dismiss(loadingToastId)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to connect to database')
      }

      await response.json()
      await checkDatabaseConnection()
      
      // Show success toast
      toast("Database connected successfully", "success", 3000)
      setError(null)
    } catch (err) {
      clearTimeout(timeoutId)
      dismiss(loadingToastId)
      
      let errorMessage = 'Failed to connect'
      if (err instanceof Error) {
        errorMessage = err.name === 'AbortError' 
          ? 'Connection timeout. Database might be unreachable.' 
          : err.message
      }
      
      // Show error toast
      toast(`Connection failed: ${errorMessage}`, "error", 5000)
    }
  }

  const handleChatMessage = async (message: string) => {
    // TipTap clean text
    const cleanMessage = message.trim()

    setLoading(true)
    let sessionMaybe = findSession(activeSessionId)
    if (!sessionMaybe) {
      sessionMaybe = createSession(cleanMessage.slice(0, 40) || 'New chat')
    }
    const session: ChatSession = sessionMaybe
    const userMessages: ChatSession['messages'] = [...session.messages, { role: 'user' as const, content: cleanMessage }]
    const updatedSession: ChatSession = {
      ...session,
      messages: userMessages,
      updatedAt: new Date().toISOString(),
    }
    upsertSession(updatedSession)
    setChatHistory(userMessages)
    setActiveSessionId(updatedSession.id)

    try {
      const response = await fetch(apiEndpoint('generate_dashboard'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: cleanMessage }),
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
      console.log('[App handleChatSubmit] Received data from API:', data);
      console.log('[App handleChatSubmit] Data sources:', Object.keys(data.data), 'with lengths:', Object.entries(data.data).map(([k, v]) => `${k}: ${v?.length ?? 0}`));

      // Merge new widgets and data sources with existing result if available
      if (result && result.spec) {
        // Generate a unique suffix for this batch of additions to prevent ID collisions
        const batchSuffix = `_${Date.now().toString(36)}`
        
        // Rewrite IDs in the new spec and data to be unique
        const remappedNewSpec = { ...data.spec }
        const remappedNewData: Record<string, any[]> = {}
        
        // Map old source ID -> new unique source ID
        const sourceIdMap: Record<string, string> = {}
        
        // 1. Remap Data Sources
        remappedNewSpec.dataSources = data.spec.dataSources.map(ds => {
          const newId = `${ds.id}${batchSuffix}`
          sourceIdMap[ds.id] = newId
          
          // Move data to new key
          if (data.data[ds.id]) {
            remappedNewData[newId] = data.data[ds.id]
          }
          
          return { ...ds, id: newId }
        })
        
        // 2. Remap Widgets
        remappedNewSpec.widgets = data.spec.widgets.map(w => {
          return {
            ...w,
            id: `${w.id}${batchSuffix}`,
            dataSource: w.dataSource ? sourceIdMap[w.dataSource] : undefined,
            // Also remap targetWidgetIds for filters if they exist in this batch
            targetWidgetIds: w.targetWidgetIds?.map(tid => `${tid}${batchSuffix}`)
          }
        })

        const mergedSpec: DashboardSpec = {
          ...result.spec,
          widgets: [...result.spec.widgets, ...remappedNewSpec.widgets],
          dataSources: [...result.spec.dataSources, ...remappedNewSpec.dataSources]
        }
        
        // Merge data: simply spread the remapped new data into the existing data
        const mergedData = { ...result.data, ...remappedNewData }
        
        const mergedResult = {
          spec: mergedSpec,
          data: mergedData
        }
        
        setResult(mergedResult)
        
        const assistantMessage: ChatSession['messages'][number] = { role: 'assistant', content: `I've updated the dashboard based on your request.` }
        const finalMessages: ChatSession['messages'] = [...userMessages, assistantMessage]
        setChatHistory(finalMessages)
        const dashboardSnapshot: DashboardSnapshot = {
          id: `dash-${Date.now()}`,
          prompt: cleanMessage,
          result: trimResult(mergedResult)!,
          createdAt: new Date().toISOString(),
        }
        const finalSession: ChatSession = {
          ...updatedSession,
          messages: finalMessages,
          result: trimResult(mergedResult),
          dashboards: [...updatedSession.dashboards, dashboardSnapshot].slice(0, MAX_SESSIONS),
          updatedAt: new Date().toISOString()
        }
        upsertSession(finalSession)
      } else {
        setResult(data)
        const assistantMessage: ChatSession['messages'][number] = { role: 'assistant', content: `I've updated the dashboard based on your request.` }
        const finalMessages: ChatSession['messages'] = [...userMessages, assistantMessage]
        setChatHistory(finalMessages)
        const dashboardSnapshot: DashboardSnapshot = {
          id: `dash-${Date.now()}`,
          prompt: cleanMessage,
          result: trimResult(data)!,
          createdAt: new Date().toISOString(),
        }
        const finalSession: ChatSession = {
          ...updatedSession,
          messages: finalMessages,
          result: trimResult(data),
          dashboards: [...updatedSession.dashboards, dashboardSnapshot].slice(0, MAX_SESSIONS),
          updatedAt: new Date().toISOString()
        }
        upsertSession(finalSession)
      }
    } catch (err) {
      let errorMsg = 'Failed to process request'
      if (err instanceof TypeError && err.message.includes('fetch')) {
        errorMsg = `Failed to connect to backend server. Make sure the backend is running on ${apiEndpoint('')}`
      } else if (err instanceof Error) {
        errorMsg = err.message
      }
      setError(errorMsg)
      const assistantMessage: ChatSession['messages'][number] = { role: 'assistant', content: `Error: ${errorMsg}` }
      const errorMessages: ChatSession['messages'] = [...userMessages, assistantMessage]
      setChatHistory(errorMessages)
      const finalSession: ChatSession = {
        ...updatedSession,
        messages: errorMessages,
        result: trimResult(result),
        updatedAt: new Date().toISOString()
      }
      upsertSession(finalSession)
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
            <button className="create-app-button" onClick={startNewChat}>New chat</button>
            
            <div className="sidebar-section">
              <div className="section-header">
                <span>CHATS</span>
                <span className="section-icon">━</span>
              </div>
              <div className="section-content">
                {chatSessions.length === 0 ? (
                  <div className="section-content">No chats yet</div>
                ) : (
                  <div className="dashboard-list">
                    {chatSessions.map((session) => (
                      <div
                        key={session.id}
                        className={`dashboard-item ${session.id === activeSessionId ? 'active' : ''}`}
                        onClick={() => selectSession(session.id)}
                      >
                        <span className="dashboard-item-title">{session.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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

      {selectedDataSource && (
        <ConnectionForm
          type={selectedDataSource}
          isOpen={showConnectionForm}
          onConnect={handleConnect}
          onCancel={() => {
            setShowConnectionForm(false)
            setSelectedDataSource(null)
          }}
        />
      )}

      <main className={`main-content ${showChat ? 'with-chat' : ''} ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <div className={`content-shell ${result ? 'has-result' : ''}`}>
          {!result && (
            <>
              <div className="content-header">
                <h1>What can I build for you?</h1>
              </div>

              <form onSubmit={handleSubmit} className="prompt-form">
                <div className="prompt-input-wrapper">
                  <PromptEditor
                    value={prompt}
                    onChange={setPrompt}
                    placeholder="Build a table for me to see all my users. Use @ to see available tables."
                    disabled={loading}
                    availableTables={availableTables}
                  />
                  <div className="prompt-meta">
                    {dbConnected ? (
                      <DatabaseSwitcher 
                        currentDatabaseName={databaseName}
                        currentDatabaseType={databaseType}
                        onSwitch={checkDatabaseConnection}
                        onAdd={() => setShowDataSourceModal(true)}
                      />
                    ) : (
                      <span className={`db-status ${dbConnected ? 'connected' : 'disconnected'}`}>
                        <span className="db-icon">🗄️</span>
                        No DB Connected
                      </span>
                    )}
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

              {dbConnected && (
                <DashboardSuggestions
                  onSelectSuggestion={(prompt) => {
                    setPrompt(prompt)
                    // Optionally auto-submit, or just populate the input
                  }}
                  dbConnected={dbConnected}
                />
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
                  <div className="dashboard-header-meta">
                    <span className="db-icon-small">🗄️</span>
                    <span className="dashboard-url">dashboard.com/dashboards/preview</span>
                  </div>
                </div>
                <div className="dashboard-header-actions">
                  <button className="header-action-icon" title="View SQL Queries" onClick={() => {
                    setShowSQL(!showSQL)
                    if (!showSQL) setShowJSON(false)
                  }}>
                    <span>SQL</span>
                  </button>
                  <button className="header-action-icon" title="View JSON Spec" onClick={() => {
                    setShowJSON(!showJSON)
                    if (!showJSON) setShowSQL(false)
                  }}>
                    <span>{`{}`}</span>
                  </button>
                  <button className="header-action-button primary">
                    <span>Share</span>
                  </button>
                </div>
              </div>
              
              {showSQL ? (
                <div className="result-panel">
                  <h2>SQL Queries</h2>
                  {result.spec.dataSources.map((dataSource, index) => (
                    <div key={dataSource.id} className="sql-query-section">
                      <h3 className="sql-query-title">
                        {dataSource.id}
                        {dataSource.primaryKey && (
                          <span className="sql-primary-key"> (Primary Key: {dataSource.primaryKey})</span>
                        )}
                      </h3>
                      <pre className="code-block">
                        <code>{dataSource.sql}</code>
                      </pre>
                    </div>
                  ))}
                </div>
              ) : showJSON ? (
                <div className="result-panel">
                  <h2>Dashboard Spec</h2>
                  <pre className="code-block">
                    <code>{JSON.stringify(result.spec, null, 2)}</code>
                  </pre>
                </div>
              ) : (
                <div className="dashboard-container">
                  {(() => {
                    console.log('[App Render] Rendering SchemaRenderer with result:', result);
                    console.log('[App Render] Data keys:', Object.keys(result.data), 'with lengths:', Object.entries(result.data).map(([k, v]) => `${k}: ${v?.length ?? 0}`));
                    return null;
                  })()}
                  <SchemaRenderer
                    spec={result.spec}
                    data={result.data}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  )
}

export default App
