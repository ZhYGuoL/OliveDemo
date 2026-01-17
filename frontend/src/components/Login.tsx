import React, { useState } from 'react'
import { supabase } from '../supabaseClient'
import './Login.css'

interface LoginProps {
  onLoginSuccess: () => void
}

export function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSignUp, setIsSignUp] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })

        if (error) throw error

        setError('Check your email for the confirmation link!')
        setIsSignUp(false)
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        onLoginSuccess()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError(null)
    setIsLoading(true)

    try {
      // Get the correct redirect URL based on environment
      // For localhost: http://localhost:5173
      // For GitHub Pages: https://zhyguol.github.io/OliveDemo
      let redirectTo = window.location.origin
      if (window.location.hostname !== 'localhost') {
        // Include the base path for production (GitHub Pages)
        redirectTo = window.location.origin + '/OliveDemo'
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      })

      if (error) throw error
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed')
      setIsLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <div className="login-logo">
            <div className="login-logo-circle">O</div>
          </div>
          <h1>OliveDemo</h1>
          <p>AI-Powered Dashboard Generator</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              disabled={isLoading}
              placeholder="your@email.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          {error && (
            <div className={`login-message ${error.includes('Check your email') ? 'success' : 'error'}`}>
              {error}
            </div>
          )}

          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? 'Please wait...' : (isSignUp ? 'Sign Up' : 'Login')}
          </button>

          <div className="login-divider">
            <span>OR</span>
          </div>

          <button
            type="button"
            className="google-button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
          >
            <svg className="google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <button
            type="button"
            className="switch-mode-button"
            onClick={() => {
              setIsSignUp(!isSignUp)
              setError(null)
            }}
            disabled={isLoading}
          >
            {isSignUp ? 'Already have an account? Login' : 'Need an account? Sign up'}
          </button>
        </form>

        <div className="login-footer">
          <p>Secure authentication powered by Supabase</p>
        </div>
      </div>
    </div>
  )
}
