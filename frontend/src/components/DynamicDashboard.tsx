import { useEffect, useState, useRef } from 'react'
import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Recharts from 'recharts'

interface DynamicDashboardProps {
  componentCode: string
  data: any[]
}

export function DynamicDashboard({ componentCode, data }: DynamicDashboardProps) {
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<ReactDOM.Root | null>(null)

  useEffect(() => {
    if (!componentCode || !data || !containerRef.current) return

    try {
      // Clean up the component code
      let cleanedCode = componentCode.trim()
      
      // Remove export keyword if present
      cleanedCode = cleanedCode.replace(/^export\s+(function|const|default\s+)/, '$1 ')
      
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

      // Wrap code to create a component factory
      // Make Recharts available via require() in the component code
      const wrappedCode = `
        (function(React, Recharts) {
          // Make Recharts available via require()
          const require = (module) => {
            if (module === 'recharts') {
              return Recharts;
            }
            throw new Error('Module ' + module + ' not found');
          };
          
          ${cleanedCode}
          
          // Find the component
          let Component = ${componentName};
          if (!Component) {
            throw new Error('Component ${componentName} not found');
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

      // Cleanup previous root
      if (rootRef.current) {
        rootRef.current.unmount()
      }

      // Create new root and render
      const root = ReactDOM.createRoot(containerRef.current!)
      rootRef.current = root
      root.render(React.createElement(Component, { data }))

      setError(null)
    } catch (err) {
      console.error('Error rendering component:', err)
      setError(err instanceof Error ? err.message : 'Failed to render component')
    }

    // Cleanup function
    return () => {
      if (rootRef.current) {
        rootRef.current.unmount()
        rootRef.current = null
      }
    }
  }, [componentCode, data])

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
      <div ref={containerRef} className="dashboard-render-target" />
    </div>
  )
}

