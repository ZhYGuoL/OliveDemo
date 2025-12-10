import { useEffect, useState, useRef, Component, ErrorInfo, ReactNode } from 'react'
import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Recharts from 'recharts'
import { DateRangeFilter, CheckboxFilter, ChartContainer, FilterSection } from './dashboard'

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

    // Start performance timing
    const renderStartTime = performance.now()

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
      
      // Fix malformed return statements: return (> -> return (
      cleanedCode = cleanedCode.replace(/return\s*\(\s*>/g, 'return (')
      cleanedCode = cleanedCode.replace(/return\s*>/g, 'return (')
      
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
      
      // Fix React.useState, React.useEffect, etc. to just useState, useEffect (hooks are provided directly)
      cleanedCode = cleanedCode.replace(/React\.useState/g, 'useState')
      cleanedCode = cleanedCode.replace(/React\.useEffect/g, 'useEffect')
      cleanedCode = cleanedCode.replace(/React\.useRef/g, 'useRef')
      cleanedCode = cleanedCode.replace(/React\.useMemo/g, 'useMemo')
      cleanedCode = cleanedCode.replace(/React\.useCallback/g, 'useCallback')
      
      // Fix column name mismatches - use actual data keys
      if (data && data.length > 0) {
        const actualKeys = Object.keys(data[0])
        console.log('Fixing column names. Actual keys:', actualKeys)
        
        // Common mismatches: units_sold -> total_units, etc.
        actualKeys.forEach(actualKey => {
          // If component uses a similar but wrong key, replace it
          // Pattern: dataKey="units_sold" when actual key is "total_units"
          if (actualKey.includes('total') || actualKey.includes('sum')) {
            // Replace common wrong patterns
            cleanedCode = cleanedCode.replace(
              new RegExp(`dataKey=["']units_sold["']`, 'g'),
              `dataKey="${actualKey}"`
            )
            cleanedCode = cleanedCode.replace(
              new RegExp(`dataKey=["']units["']`, 'g'),
              `dataKey="${actualKey}"`
            )
          }
          
          // Fix date field references
          if (actualKey.includes('date') || actualKey.includes('Date')) {
            cleanedCode = cleanedCode.replace(
              new RegExp(`dataKey=["']transaction_date["']`, 'g'),
              `dataKey="${actualKey}"`
            )
            cleanedCode = cleanedCode.replace(
              new RegExp(`item\\.transaction_date`, 'g'),
              `item.${actualKey}`
            )
          }
        })
      }
      
      // Fix double curly braces in data prop: data={{filteredData}} -> data={filteredData}
      // This is a common LLM mistake - double braces create an object literal instead of passing the variable
      // Match: data={{filteredData}} or data={{data}} etc. (with optional whitespace)
      // Try multiple patterns to catch all variations
      cleanedCode = cleanedCode.replace(/data\s*=\s*\{\{\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\}\}/g, 'data={$1}')
      cleanedCode = cleanedCode.replace(/data=\{\{([a-zA-Z_$][a-zA-Z0-9_$]*)\}\}/g, 'data={$1}')
      // Also fix other common double brace patterns in chart components
      cleanedCode = cleanedCode.replace(/(LineChart|BarChart|PieChart|AreaChart)\s+data\s*=\s*\{\{\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\}\}/g, '$1 data={$2}')
      cleanedCode = cleanedCode.replace(/(LineChart|BarChart|PieChart|AreaChart)\s+data=\{\{([a-zA-Z_$][a-zA-Z0-9_$]*)\}\}/g, '$1 data={$2}')
      // Fix any prop={{variable}} pattern where variable is a simple identifier (not an object literal)
      cleanedCode = cleanedCode.replace(/(\w+)\s*=\s*\{\{\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\}\}/g, '$1={$2}')
      cleanedCode = cleanedCode.replace(/(\w+)=\{\{([a-zA-Z_$][a-zA-Z0-9_$]*)\}\}/g, '$1={$2}')
      
      // Log if we found and fixed double braces
      if (cleanedCode.includes('data={{')) {
        console.warn('⚠️ Found double braces in data prop - attempting to fix')
        // Last resort: replace any remaining data={{variable}} patterns
        cleanedCode = cleanedCode.replace(/data=\{\{([^}]+)\}\}/g, 'data={$1}')
      }
      
      // Ensure date filter inputs are always visible (not conditionally hidden)
      // Fix patterns where filters might be conditionally rendered and hidden
      // Pattern: {condition ? <div>filters</div> : <div>filters</div>} -> always show filters
      cleanedCode = cleanedCode.replace(
        /\{startDate\s*&&\s*endDate\s*\?\s*\([^)]*<div[^>]*>.*?Filter.*?<\/div>[^)]*\)\s*:\s*\([^)]*<div[^>]*>.*?Filter.*?<\/div>[^)]*\)\}/gs,
        (match) => {
          // Extract the filter div content (use the first one since both are the same)
          const filterMatch = match.match(/<div[^>]*>(.*?Filter.*?<\/div>)/s);
          if (filterMatch) {
            return filterMatch[0].replace(/^\(|\)$/g, ''); // Remove conditional wrapper
          }
          return match;
        }
      );
      
      // Fix incomplete function calls (like updateGraph() without definition)
      // This is a heuristic - if a function is called but not defined, remove the call
      // But we'll let it through and let React handle the error for now

      // Fix common date filter issue: when startDate/endDate are null, show all data
      // Pattern: data.filter(item => item.date >= startDate && item.date <= endDate)
      // Should be: (startDate && endDate) ? data.filter(...) : data
      cleanedCode = cleanedCode.replace(
        /const\s+filteredData\s*=\s*data\.filter\(([^)]+startDate[^)]+endDate[^)]+)\)/g,
        (_match, filterBody) => {
          return `const filteredData = (startDate && endDate) ? data.filter(${filterBody}) : data`;
        }
      );
      
      // Also handle simpler patterns: filteredData = data.filter(item => item.date >= startDate && item.date <= endDate)
      cleanedCode = cleanedCode.replace(
        /(\w+)\s*=\s*data\.filter\(item\s*=>\s*item\.(\w+)\s*>=\s*(\w+)\s*&&\s*item\.\w+\s*<=\s*(\w+)\)/g,
        (_match, varName, dateField, startVar, endVar) => {
          return `${varName} = (${startVar} && ${endVar}) ? data.filter(item => item.${dateField} >= ${startVar} && item.${dateField} <= ${endVar}) : data`;
        }
      );
      
      // More general pattern: any filter with startDate/endDate that doesn't check for null
      if (cleanedCode.includes('filteredData') && cleanedCode.includes('startDate') && cleanedCode.includes('endDate')) {
        // Check if it already has the null check
        if (!cleanedCode.includes('startDate && endDate')) {
          // Try to fix: filteredData = data.filter(...) -> filteredData = (startDate && endDate) ? data.filter(...) : data
          cleanedCode = cleanedCode.replace(
            /(const\s+filteredData\s*=\s*)data\.filter\(([^)]+)\)/g,
            (_match, prefix, filterBody) => {
              if (filterBody.includes('startDate') || filterBody.includes('endDate')) {
                return `${prefix}(startDate && endDate) ? data.filter(${filterBody}) : data`;
              }
              return _match;
            }
          );
        }
      }
      
      // Final aggressive fix for double braces - do this right before logging
      // Replace any pattern like data={{variable}} regardless of whitespace
      cleanedCode = cleanedCode.replace(/data\s*=\s*\{\{\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\}\}/g, 'data={$1}')
      
      console.log('Cleaned Code Preview:', cleanedCode.substring(0, 1000))
      
      // Check if double braces still exist after all fixes
      if (cleanedCode.match(/data\s*=\s*\{\{/)) {
        console.error('❌ Double braces still found in cleaned code!')
        const match = cleanedCode.match(/data\s*=\s*\{\{[^}]+\}\}/)
        if (match) {
          console.error('Found:', match[0])
          // Force fix it
          cleanedCode = cleanedCode.replace(/data\s*=\s*\{\{([^}]+)\}\}/g, 'data={$1}')
          console.log('✅ Force-fixed double braces')
        }
      }
      
      // Check if component has a return statement
      if (!cleanedCode.includes('return')) {
        console.warn('⚠️ Component code does not contain a return statement!')
      }
      
      // Check if component might return null conditionally
      if (cleanedCode.includes('return null') || cleanedCode.includes('return undefined')) {
        console.warn('⚠️ Component code contains "return null" or "return undefined" - this will cause empty render')
      }

      // Final aggressive fix for double braces RIGHT BEFORE wrapping (last chance!)
      // This catches any remaining data={{variable}} patterns
      cleanedCode = cleanedCode.replace(/data\s*=\s*\{\{\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\}\}/g, 'data={$1}')
      cleanedCode = cleanedCode.replace(/data=\{\{([a-zA-Z_$][a-zA-Z0-9_$]*)\}\}/g, 'data={$1}')
      
      // Wrap code to create a component factory with Recharts components, React hooks, and dashboard components in scope
      const wrappedCode = `
        (function(React, Recharts, DashboardComponents) {
          // Make React hooks available
          const { useState, useEffect, useRef, useMemo, useCallback } = React;
          
          // Destructure Recharts components so they are available globally in this scope
          const { 
            BarChart, LineChart, PieChart, AreaChart, 
            XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
            Bar, Line, Pie, Cell, Area, 
            ResponsiveContainer 
          } = Recharts;
          
          // Make dashboard components available
          const { DateRangeFilter, CheckboxFilter, ChartContainer, FilterSection } = DashboardComponents;
          
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

      // Evaluate the transformed code with React, Recharts, and Dashboard Components
      let Component
      try {
        const componentFactory = eval(transformedCode)
        const DashboardComponents = {
          DateRangeFilter,
          CheckboxFilter,
          ChartContainer,
          FilterSection
        }
        Component = componentFactory(React, Recharts, DashboardComponents)
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
      
      // Transform data to ensure numeric fields are numbers (Recharts needs numbers)
      // This must be done BEFORE any use of transformedData
      const transformedData = data && data.length > 0 ? data.map((row: any) => {
        const transformed: any = {}
        Object.keys(row).forEach(key => {
          const value = row[key]
          // Convert numeric strings to numbers
          if (typeof value === 'string' && value !== '' && !isNaN(Number(value)) && !isNaN(parseFloat(value))) {
            // Check if it's a date string first (YYYY-MM-DD format)
            if (!/^\d{4}-\d{2}-\d{2}/.test(value)) {
              transformed[key] = parseFloat(value)
            } else {
              transformed[key] = value
            }
          } else {
            transformed[key] = value
          }
        })
        return transformed
      }) : data
      
      console.log('Transformed data sample:', transformedData?.[0])
      
      // Get or create root (reuse existing root to avoid unmount issues)
      let root = rootRef.current
      if (!root) {
        root = ReactDOM.createRoot(containerRef.current!)
        rootRef.current = root
      }
      
      console.log('Rendering component with data:', transformedData?.length || 0, 'rows')
      
      // Render with error boundary
      const handleRenderError = (err: Error, errorInfo: ErrorInfo) => {
        if (!isActive) return
        console.error('Runtime render error:', err)
        console.error('Error stack:', err.stack)
        console.error('Component stack:', errorInfo.componentStack)
        console.error('Error details:', {
          name: err.name,
          message: err.message,
          componentStack: errorInfo.componentStack
        })
        setError(`Runtime Error: ${err.message}. Check console for details.`)
      }
      
      // Wrap component render in try-catch to catch synchronous errors
      const renderWithErrorHandling = () => {
        try {
          // Check data structure before rendering
          if (transformedData && transformedData.length > 0) {
            const firstRow = transformedData[0]
            const availableKeys = Object.keys(firstRow)
            console.log('Available data keys:', availableKeys)
            console.log('Sample data row:', JSON.stringify(firstRow, null, 2))
            
            // Check if dates need formatting
            availableKeys.forEach(key => {
              if (key.includes('date') || key.includes('Date')) {
                const value = firstRow[key]
                console.log(`Date field "${key}" type:`, typeof value, 'value:', value)
              }
              // Check numeric fields
              if (key.includes('total') || key.includes('sum') || key.includes('count') || key.includes('units')) {
                const value = firstRow[key]
                console.log(`Numeric field "${key}" type:`, typeof value, 'value:', value)
              }
            })
          }
          
          return element
        } catch (err) {
          console.error('Error in renderWithErrorHandling:', err)
          throw err
        }
      }

      // Render the component with error handling
      let element
      try {
        element = React.createElement(Component, { data: transformedData })
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
      const elementToRender = renderWithErrorHandling()
      const wrappedElement = React.createElement(
        'div',
        { style: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '20px', overflow: 'auto' } },
        elementToRender || React.createElement('div', { style: { color: 'red', padding: '20px' } }, 'Component returned null or undefined')
      )
      
      console.log('Element to render:', elementToRender)
      console.log('Wrapped element:', wrappedElement)
      
      try {
        root.render(
          <ErrorBoundary onError={handleRenderError}>
            {wrappedElement}
          </ErrorBoundary>
        )
        
        const renderEndTime = performance.now()
        const renderDuration = renderEndTime - renderStartTime
        
        console.log('Component rendered')
        console.log(`⏱️ Dashboard render time: ${renderDuration.toFixed(2)}ms`)
        setRenderAttempted(true)
        
        // Log data info for debugging
        if (transformedData && transformedData.length > 0) {
          console.log('Data fields available:', Object.keys(transformedData[0]))
          console.log('Sample data row:', transformedData[0])
          console.log('Data types:', Object.keys(transformedData[0]).map(key => ({
            key,
            type: typeof transformedData[0][key],
            value: transformedData[0][key]
          })))
        }
      } catch (err) {
        if (isActive) {
          console.error('Error during render:', err)
          setError(err instanceof Error ? err.message : 'Failed to render component')
        }
      }
      
      // Cleanup function
      return () => {
        isActive = false
        // Cleanup: unmount the React root when component unmounts
        if (rootRef.current) {
          rootRef.current.render(null)
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
        style={{ 
          width: '100%', 
          height: '100%',
          flex: 1,
          backgroundColor: '#F9FAFB',
          overflow: 'auto'
        }}
      />
      {!error && renderAttempted && data && data.length > 0 && (
        <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#6b7280', padding: '0.5rem' }}>
          <strong>Data available:</strong> {data.length} rows. If dashboard is empty, check browser console for errors.
        </div>
      )}
    </div>
  )
}
