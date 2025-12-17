import { useState, useEffect } from 'react'
import { apiEndpoint } from '../config'
import './DashboardSuggestions.css'

interface DashboardSuggestion {
  title: string
  description: string
  features: string[]
  prompt: string
}

interface DashboardSuggestionsProps {
  onSelectSuggestion: (prompt: string) => void
  dbConnected: boolean
}

export function DashboardSuggestions({ onSelectSuggestion, dbConnected }: DashboardSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<DashboardSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (dbConnected) {
      fetchSuggestions()
    } else {
      setSuggestions([])
    }
  }, [dbConnected])

  const fetchSuggestions = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(apiEndpoint('suggestions'))
      if (response.ok) {
        const data = await response.json()
        setSuggestions(data.suggestions || [])
      } else {
        setError('Failed to load suggestions')
      }
    } catch (err) {
      setError('Failed to load suggestions')
      console.error('Error fetching suggestions:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!dbConnected) {
    return null
  }

  if (loading) {
    return (
      <div className="dashboard-suggestions">
        <div className="suggestions-header">
          <h2 className="suggestions-title">
            <span className="sparkle-icon">✦</span>
            Suggestions for your data
          </h2>
        </div>
        <div className="suggestions-loading">Loading suggestions...</div>
      </div>
    )
  }

  if (error || suggestions.length === 0) {
    return null
  }

  return (
    <div className="dashboard-suggestions">
      <div className="suggestions-header">
        <h2 className="suggestions-title">
          <span className="sparkle-icon">✦</span>
          Suggestions for your data
        </h2>
        <button 
          className="more-ideas-button"
          onClick={fetchSuggestions}
          title="Refresh suggestions"
        >
          <span className="lightbulb-icon">💡</span>
          More ideas
        </button>
      </div>
      
      <div className="suggestions-grid">
        {suggestions.map((suggestion, index) => (
          <div key={index} className="suggestion-card">
            <h3 className="suggestion-title">{suggestion.title}</h3>
            <p className="suggestion-description">{suggestion.description}</p>
            <ul className="suggestion-features">
              {suggestion.features.map((feature, fIndex) => (
                <li key={fIndex}>{feature}</li>
              ))}
            </ul>
            <button
              className="use-suggestion-button"
              onClick={() => onSelectSuggestion(suggestion.prompt)}
            >
              <span className="play-icon">▶</span>
              Use This Suggestion
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

