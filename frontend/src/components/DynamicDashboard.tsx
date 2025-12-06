import { useEffect, useState, useRef, Component, ErrorInfo, ReactNode } from 'react'
import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Recharts from 'recharts'

interface DynamicDashboardProps {
  componentCode: string
  data: any[]
}

// Error Boundary Component to catch render errors in dynamic components
class ErrorBoundary extends Component<{ children: ReactNode, onError: (error: Error, errorInfo: ErrorInfo) => void }, { hasError: boolean }> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return null // The parent will handle showing the error UI
    }
    return this.props.children
  }
}

export function DynamicDashboard({ componentCode, data }: DynamicDashboardProps) {
  const [error, setError] = useState<string | null>(null)
  const [renderAttempted, setRenderAttempted] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<ReactDOM.Root | null>(null)

  useEffect(() => {
    if (!componentCode || !data || !containerRef.current) return

    // Reset error state
    setError(null)
    setRenderAttempted(false)

    try {
      console.log('--- DynamicDashboard Processing Start ---')
      
      // Clean up the component code
      let cleanedCode = componentCode.trim()
      
      // Remove export default (must be removed before named exports)
      cleanedCode = cleanedCode.replace(/^export\s+default\s+/gm, '')
      // Remove other export keywords
      cleanedCode = cleanedCode.replace(/^export\s+/gm, '')
      
      // Fix incomplete require statements (missing closing paren/semicolon)
      // Match require('module' or require("module" without closing paren
      cleanedCode = cleanedCode.replace(/require\((['"])([^'"]+)\1\s*$/gm, "require($1$2$1);")
      // Also fix cases where there's a newline after the require
      cleanedCode = cleanedCode.replace(/require\((['"])([^'"]+)\1\s*\n/g, "require($1$2$1);\n")
      
      // Strip TypeScript type annotations (fallback in case LLM generates TypeScript)
      // Handle function parameters with destructured types: function Dashboard({ data }: { data: any[] })
      // This regex matches { param } : { type } and replaces with { param }
      cleanedCode = cleanedCode.replace(/\{\s*([^}:]+)\s*\}\s*:\s*\{[^}]*\}/g, '{$1}')
      
      // Handle arrow function parameters: ({ data }: { data: any[] }) =>
      cleanedCode = cleanedCode.replace(/\(\s*\{\s*([^}:]+)\s*\}\s*:\s*\{[^}]*\}\s*\)/g, '({$1})')
      
      // Remove all remaining type annotations: : type
      // Match : followed by any type expression
      cleanedCode = cleanedCode.replace(/:\s*\{[^}]*\}/g, '')
      cleanedCode = cleanedCode.replace(/:\s*any\[\]/g, '')
      cleanedCode = cleanedCode.replace(/:\s*any\b/g, '')
      cleanedCode = cleanedCode.replace(/:\s*string\b/g, '')
      cleanedCode = cleanedCode.replace(/:\s*number\b/g, '')
      cleanedCode = cleanedCode.replace(/:\s*boolean\b/g, '')
      cleanedCode = cleanedCode.replace(/:\s*React\.ReactNode\b/g, '')
      cleanedCode = cleanedCode.replace(/:\s*JSX\.Element\b/g, '')
      cleanedCode = cleanedCode.replace(/:\s*void\b/g, '')
      
      // Extract component name (look for function Dashboard, const Dashboard, etc.)
      let componentName = 'Dashboard'
      const functionMatch = cleanedCode.match(/(?:function|const)\s+(\w+)/)
      if (functionMatch) {
        componentName = functionMatch[1]
      }

      // Remove any require('recharts') statements since we'll inject components directly
      cleanedCode = cleanedCode.replace(/const\s+{.*?}\s*=\s*require\(['"]recharts['"]\);?/g, '')
      cleanedCode = cleanedCode.replace(/const\s+.*?\s*=\s*require\(['"]recharts['"]\);?/g, '')
      cleanedCode = cleanedCode.replace(/require\(['"]recharts['"]\)/g, '{}')

      console.log('Cleaned Code Preview:', cleanedCode.substring(0, 200) + '...')

      // Wrap code to create a component factory with Recharts components in scope
      const wrappedCode = `
        (function(React, Recharts) {
          // Destructure Recharts components so they are available globally in this scope
          const { 
            BarChart, LineChart, PieChart, AreaChart, 
            XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
            Bar, Line, Pie, Cell, Area, 
            ResponsiveContainer 
          } = Recharts;
          
          // Mock require for any other modules, though we removed recharts require
          const require = (module) => {
            if (module === 'recharts') return Recharts;
            throw new Error('Module ' + module + ' not found');
          };
          
          ${cleanedCode}
          
          // Find the component
          let Component = ${componentName};
          if (!Component) {
            // Try to find any function if specific name not found
            if (typeof Dashboard !== 'undefined') Component = Dashboard;
            else throw new Error('Component ${componentName} not found and no fallback found');
          }
          
          return Component;
        })
      `

      // Transform JSX with Babel
      if (!(window as any).Babel) {
        throw new Error('Babel standalone not loaded')
      }

      const transformedCode = (window as any).Babel.transform(wrappedCode, {
        presets: ['react'],
      }).code

      // Evaluate the transformed code with React and Recharts
      const componentFactory = eval(transformedCode)
      const Component = componentFactory(React, Recharts)
      
      if (!Component) {
        throw new Error(`Component factory returned null or undefined. Component name: ${componentName}`)
      }
      
      if (typeof Component !== 'function') {
        throw new Error(`Component is not a function. Type: ${typeof Component}, Value: ${Component}`)
      }

      // Always create a new root to ensure clean state
      // Unmount existing root if it exists
      if (rootRef.current) {
        rootRef.current.unmount()
        rootRef.current = null
      }
      
      // Clear container
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
      
      // Create new root
      const root = ReactDOM.createRoot(containerRef.current!)
      rootRef.current = root
      
      console.log('Rendering component with data:', data?.length || 0, 'rows')
      
      // Render with error boundary
      const handleRenderError = (err: Error, errorInfo: ErrorInfo) => {
        console.error('Runtime render error:', err)
        console.error('Component stack:', errorInfo.componentStack)
        setError(`Runtime Error: ${err.message}`)
      }

      // Render the component
      const element = React.createElement(Component, { data })
      console.log('Created React element:', element)
      
      root.render(
        <ErrorBoundary onError={handleRenderError}>
          {element}
        </ErrorBoundary>
      )
      
      console.log('Component render scheduled')
      setRenderAttempted(true)
        
      // Check after render completes if the container is still empty
      // Use requestAnimationFrame to check after React has flushed updates
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (containerRef.current) {
            const hasChildren = containerRef.current.children.length > 0
            const hasTextContent = containerRef.current.textContent && containerRef.current.textContent.trim().length > 0
            console.log('Container check:', {
              hasChildren,
              childrenCount: containerRef.current.children.length,
              hasTextContent,
              innerHTML: containerRef.current.innerHTML.substring(0, 200)
            })
            
            if (!hasChildren && !hasTextContent) {
              console.warn('Dashboard container appears empty after render')
              // Try to render a simple test component to verify React root works
              const testElement = React.createElement('div', { style: { padding: '20px', color: 'red' } }, 'Test render')
              root.render(testElement)
              setTimeout(() => {
                if (containerRef.current?.textContent?.includes('Test render')) {
                  console.log('React root works, issue is with the component')
                  // Re-render the actual component
                  root.render(
                    <ErrorBoundary onError={handleRenderError}>
                      {element}
                    </ErrorBoundary>
                  )
                }
              }, 100)
            }
          }
        }, 500)
      })

    } catch (err) {
      console.error('Error rendering component:', err)
      console.error('Component code:', componentCode.substring(0, 500))
      setError(err instanceof Error ? err.message : 'Failed to render component')
    }

    // Cleanup function
    return () => {
      // Intentionally empty
    }
  }, [componentCode, data])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rootRef.current) {
        setTimeout(() => {
          rootRef.current?.unmount()
          rootRef.current = null
        }, 0)
      }
    }
  }, [])

  if (error) {
    return (
      <div className="dashboard-error">
        <p>Error rendering dashboard: {error}</p>
        <details>
          <summary>Component Code</summary>
          <pre className="code-block">{componentCode}</pre>
        </details>
      </div>
    )
  }

  return (
    <div className="dynamic-dashboard-container">
      {!error && !containerRef.current && (
        <div className="dashboard-loading">Preparing dashboard...</div>
      )}
      <div 
        ref={containerRef} 
        className="dashboard-render-target" 
        style={{ height: '450px', width: '100%', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#fff', overflow: 'hidden' }}
      />
      {!error && renderAttempted && data && data.length > 0 && (
        <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#6b7280', padding: '0.5rem' }}>
          <strong>Data available:</strong> {data.length} rows. If dashboard is empty, check browser console for errors.
        </div>
      )}
    </div>
  )
}
