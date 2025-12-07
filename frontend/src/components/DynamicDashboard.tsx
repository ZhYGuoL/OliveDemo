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
      console.log('Component code length:', componentCode.length)
      console.log('Component code preview:', componentCode.substring(0, 500))
      console.log('Data length:', data?.length || 0)
      console.log('Data sample:', data?.slice(0, 2))
      
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
      
      // Remove React hook imports since they're provided in scope
      cleanedCode = cleanedCode.replace(/import\s+{.*?}\s+from\s+['"]react['"];?/g, '')
      cleanedCode = cleanedCode.replace(/const\s+{.*?}\s*=\s*require\(['"]react['"]\);?/g, '')
      
      // Fix incomplete function calls (like updateGraph() without definition)
      // This is a heuristic - if a function is called but not defined, remove the call
      // But we'll let it through and let React handle the error for now

      console.log('Cleaned Code Preview:', cleanedCode.substring(0, 1000))
      
      // Check if component has a return statement
      if (!cleanedCode.includes('return')) {
        console.warn('⚠️ Component code does not contain a return statement!')
      }
      
      // Check if component might return null conditionally
      if (cleanedCode.includes('return null') || cleanedCode.includes('return undefined')) {
        console.warn('⚠️ Component code contains "return null" or "return undefined" - this will cause empty render')
      }

      // Wrap code to create a component factory with Recharts components and React hooks in scope
      const wrappedCode = `
        (function(React, Recharts) {
          // Make React hooks available
          const { useState, useEffect, useRef, useMemo, useCallback } = React;
          
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

      let transformedCode: string
      try {
        const result = (window as any).Babel.transform(wrappedCode, {
          presets: ['react'],
        })
        transformedCode = result.code
        
        // Check for syntax errors in the transformed code
        if (!transformedCode || transformedCode.includes('SyntaxError')) {
          throw new Error('Babel transformation failed - check component code syntax')
        }
      } catch (babelError: any) {
        console.error('Babel transformation error:', babelError)
        console.error('Wrapped code length:', wrappedCode.length)
        console.error('Wrapped code preview:', wrappedCode.substring(0, 1000))
        console.error('Cleaned code preview:', cleanedCode.substring(0, 500))
        
        // Try to provide more helpful error message
        let errorMessage = `Code transformation failed: ${babelError.message || 'Unknown Babel error'}`
        if (babelError.message && babelError.message.includes('Unexpected token')) {
          errorMessage += '. The generated component code may be incomplete or contain syntax errors. Please try rephrasing your request.'
        }
        throw new Error(errorMessage)
      }

      // Evaluate the transformed code with React and Recharts
      let Component
      try {
        const componentFactory = eval(transformedCode)
        Component = componentFactory(React, Recharts)
      } catch (evalError: any) {
        console.error('Error evaluating component factory:', evalError)
        console.error('Transformed code preview:', transformedCode.substring(0, 500))
        throw new Error(`Failed to create component: ${evalError.message}`)
      }
      
      if (!Component) {
        throw new Error(`Component factory returned null or undefined. Component name: ${componentName}`)
      }
      
      if (typeof Component !== 'function') {
        throw new Error(`Component is not a function. Type: ${typeof Component}, Value: ${Component}`)
      }
      
      // Test render the component to see if it returns content
      try {
        const testElement = React.createElement(Component, { data: [] })
        console.log('Test element created:', testElement)
      } catch (testError) {
        console.warn('Error creating test element (may be normal):', testError)
      }

      // Track if this effect is still active
      let isActive = true
      let timeoutId: ReturnType<typeof setTimeout> | null = null
      let rafId: number | null = null
      
      // Get or create root (reuse existing root to avoid unmount issues)
      let root = rootRef.current
      if (!root) {
        root = ReactDOM.createRoot(containerRef.current!)
        rootRef.current = root
      }
      
      console.log('Rendering component with data:', data?.length || 0, 'rows')
      
      // Render with error boundary
      const handleRenderError = (err: Error, errorInfo: ErrorInfo) => {
        if (!isActive) return
        console.error('Runtime render error:', err)
        console.error('Component stack:', errorInfo.componentStack)
        setError(`Runtime Error: ${err.message}`)
      }

      // Render the component with error handling
      let element
      try {
        element = React.createElement(Component, { data })
        console.log('Created React element:', element)
        console.log('Element type:', element?.type?.name || element?.type)
        console.log('Element props keys:', element?.props ? Object.keys(element.props) : 'no props')
        console.log('Element props data length:', element?.props?.data?.length || 0)
        
        // Log the component code to see what was generated
        console.log('Generated component code (first 2000 chars):', componentCode.substring(0, 2000))
      } catch (createError) {
        console.error('Error creating element:', createError)
        throw createError
      }
      
      // Wrap component in a container that will show content even if component returns null
      const wrappedElement = React.createElement(
        'div',
        { style: { width: '100%', height: '100%', minHeight: '400px', padding: '20px' } },
        element || React.createElement('div', { style: { color: 'red', padding: '20px' } }, 'Component returned null or undefined')
      )
      
      try {
        root.render(
          <ErrorBoundary onError={handleRenderError}>
            {wrappedElement}
          </ErrorBoundary>
        )
        
        console.log('Component render scheduled')
        setRenderAttempted(true)
        
        // Check after render completes (with proper cleanup)
        rafId = requestAnimationFrame(() => {
          timeoutId = setTimeout(() => {
            if (!isActive || !containerRef.current || !rootRef.current) return
            
            const container = containerRef.current
            const hasChildren = container.children.length > 0
            const hasTextContent = container.textContent && container.textContent.trim().length > 0
            const innerHTML = container.innerHTML
            
            console.log('Container check:', {
              hasChildren,
              childrenCount: container.children.length,
              hasTextContent,
              textContentLength: container.textContent?.length || 0,
              innerHTMLLength: innerHTML.length,
              innerHTMLPreview: innerHTML.substring(0, 500)
            })
            
            if (!hasChildren && !hasTextContent && innerHTML.length < 100) {
              console.warn('Dashboard container appears empty after render')
              console.warn('This might mean the component returned null or an empty fragment')
              console.warn('Component element:', element)
              console.warn('Component type:', element?.type)
              
              // Only try test render if component is still mounted
              if (isActive && rootRef.current) {
                try {
                  // Try rendering a test component to verify React root works
                  const testElement = React.createElement('div', {
                    style: { padding: '20px', backgroundColor: '#fee', border: '2px solid #f00' },
                    'data-test': 'test-render'
                  }, 'TEST: React root works. Component may be returning null.')
                  
                  rootRef.current.render(testElement)
                  
                  setTimeout(() => {
                    if (!isActive || !containerRef.current || !rootRef.current) return
                    
                    if (container.querySelector('[data-test="test-render"]')) {
                      console.log('✅ React root works - the issue is with the component code')
                      console.log('Component may be returning null, undefined, or an empty fragment')
                      // Re-render the actual component only if still mounted
                      if (isActive && rootRef.current) {
                        rootRef.current.render(
                          <ErrorBoundary onError={handleRenderError}>
                            <div style={{ width: '100%', height: '100%', minHeight: '400px' }}>
                              {element}
                            </div>
                          </ErrorBoundary>
                        )
                      }
                    } else {
                      console.error('❌ React root test failed - React may not be rendering')
                    }
                  }, 200)
                } catch (renderError) {
                  if (isActive) {
                    console.error('Error during test render (component may be unmounted):', renderError)
                  }
                }
              }
            }
          }, 1000) // Increased timeout
        })
      } catch (err) {
        if (isActive) {
          console.error('Error during render:', err)
          setError(err instanceof Error ? err.message : 'Failed to render component')
        }
      }
      
      // Cleanup function
      return () => {
        isActive = false
        // Cancel pending operations
        if (timeoutId !== null) {
          clearTimeout(timeoutId)
        }
        if (rafId !== null) {
          cancelAnimationFrame(rafId)
        }
      }

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
