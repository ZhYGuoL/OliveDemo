/// <reference types="vite/client" />
// API configuration
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Helper function to build API endpoints
export const apiEndpoint = (path: string) => {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  return `${API_URL}/${cleanPath}`
}
