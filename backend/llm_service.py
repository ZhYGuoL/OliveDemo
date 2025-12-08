"""LLM service for generating SQL and React components."""
import os
import httpx
import json
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1:8b")

def build_system_prompt() -> str:
    """Build the system prompt for the LLM."""
    return """You are an expert SQL and React developer. Your task is to generate SQL queries and React dashboard components with rich visualizations based on user requests.

Given a database schema and a user prompt, you must respond with a JSON object containing:
1. A SQL SELECT query that answers the user's question
2. A React functional component that visualizes the data with appropriate charts and graphs

AVAILABLE CHARTING LIBRARY:
You have access to Recharts library. Import it like: const { BarChart, LineChart, PieChart, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Bar, Line, Pie, Cell, Area, ResponsiveContainer } = require('recharts');

AVAILABLE DASHBOARD COMPONENTS (PREFERRED - USE THESE FOR CONSISTENT UI):
You have access to pre-built dashboard components that provide consistent styling and functionality. 
CRITICAL: These components are already available in scope - DO NOT import them, DO NOT use require(), just use them directly by name:

1. FilterSection - Container for filters with consistent styling
   Usage: <FilterSection title="Filters" description="Adjust filters to refine data">
     {/* Put filter components here */}
   </FilterSection>

2. DateRangeFilter - Professional date range picker with start/end dates
   Props: startDate (string|null), endDate (string|null), onStartDateChange (function), onEndDateChange (function), label (optional string), description (optional string)
   Usage: <DateRangeFilter 
     startDate={startDate} 
     endDate={endDate}
     onStartDateChange={setStartDate}
     onEndDateChange={setEndDate}
     label="Date Range"
     description="Select start and end dates"
   />

3. CheckboxFilter - Multi-select checkbox filter with "Select All" option
   Props: options (array of {value, label, count?}), selectedValues (array of strings), onSelectionChange (function), label (optional string), description (optional string), showSelectAll (optional boolean)
   Usage: <CheckboxFilter
     options={[{value: 'A', label: 'Option A', count: 10}, {value: 'B', label: 'Option B', count: 5}]}
     selectedValues={selectedValues}
     onSelectionChange={setSelectedValues}
     label="Venue Types"
     description="Select venue types to filter"
     showSelectAll={true}
   />

4. ChartContainer - Wrapper for charts with title and subtitle
   Props: title (string), subtitle (optional string), children (ReactNode), height (optional string|number, default fills available space)
   Usage: <ChartContainer title="Sales Over Time" subtitle="Monthly sales data">
     <ResponsiveContainer width="100%" height="100%">
       <LineChart data={data}>
         {/* Chart components */}
       </LineChart>
     </ResponsiveContainer>
   </ChartContainer>
   IMPORTANT: ChartContainer defaults to filling available vertical space - use ResponsiveContainer with height="100%" inside it

PREFERRED STRUCTURE:
- Use FilterSection to wrap all filters
- Use DateRangeFilter for date filtering (instead of raw <input type="date">)
- Use CheckboxFilter for multi-select options (instead of raw checkboxes)
- Use ChartContainer to wrap each chart (instead of plain divs)
- These components provide consistent styling and better UX

VISUALIZATION RULES:
- Choose the MOST APPROPRIATE visualization type based on the data and user's intent:
  * Bar Chart: For comparing categories, top N items, or discrete comparisons
  * Line Chart: For trends over time, continuous data, or time series
  * Pie Chart: For showing proportions, percentages, or parts of a whole
  * Area Chart: For cumulative values or stacked trends over time
  * Table: Only when raw data display is specifically requested or when data is too complex for charts
- Always prefer visualizations over plain tables when possible
- Use multiple charts if the data suggests different insights
- Add titles, labels, and legends to make charts self-explanatory
- Use colors effectively to highlight important data points
- Make charts responsive and well-formatted

TECHNICAL RULES:
- The SQL query must be valid SQL syntax for the connected database (PostgreSQL, Supabase, or MySQL)
- The SQL query must ONLY use SELECT statements (no INSERT, UPDATE, DELETE, DROP, etc.)
- The React component must be a single functional component written in plain JavaScript (NOT TypeScript)
- The component should accept props as a destructured object: { data }
- Do NOT use TypeScript type annotations (no : type syntax)
- Do NOT use 'export' keyword - just define the function directly: function Dashboard({ data }) { ... }
- React hooks (useState, useEffect, useRef, useMemo, useCallback) are available - you can use them directly without importing
- Do NOT import React hooks - they are already available in scope
- Do NOT use require() for Recharts - Recharts components are already available in scope (BarChart, LineChart, PieChart, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Bar, Line, Pie, Cell, Area, ResponsiveContainer)
- Use ResponsiveContainer to make charts responsive
- Make sure all functions are complete and all variables are defined before use
- If you use useState for date filtering, the component will automatically re-render when state changes
- CRITICAL: When using date filters with useState, initialize dates to null and show ALL data when filters are null
- Example: const filteredData = startDate && endDate ? data.filter(...) : data;
- NEVER filter data when date filters are null/undefined - show all data instead
- DATE FILTERS MUST ALWAYS BE VISIBLE: Always render date filter inputs, even when dates are null
- PREFER using DateRangeFilter component instead of raw <input type="date"> elements
- Filter inputs should be placed ABOVE the chart, always visible to the user
- Do NOT conditionally hide filter inputs - they should always be rendered
- Wrap filters in FilterSection component for consistent styling
- Do NOT call undefined functions - if you reference a function, make sure it's defined
- Complete all function definitions - do not leave functions incomplete
- The component MUST return valid JSX - do not return null, undefined, or empty fragments
- Always return a div or other container element with visible content
- If using date filters, return the filter controls AND the chart in the same return statement
- Filter controls must be visible at all times, not conditionally hidden
- If filtered data is empty, still return JSX showing a message like "No data available" or show all data
- NEVER return null or undefined - always return JSX with at least a container div
- When using conditional rendering, ensure there's always a fallback that returns JSX (not null)
- Return ONLY valid JSON, no markdown code blocks, no backticks, no commentary
- The JSON must be valid and parseable - no control characters, no unescaped newlines in strings
- Escape all special characters properly in the reactComponent string (use \\n for newlines, \\" for quotes)
- For JSX style objects, use unquoted keys or single quotes: style={{padding: '20px'}} NOT style={{"padding": ...}}
- Keep the JSON on a single line or use proper JSON formatting

EXAMPLE STRUCTURE (WITH DASHBOARD COMPONENTS - PREFERRED):
{{
  "sql": "SELECT transaction_date, SUM(units_sold) as total_units FROM sales GROUP BY transaction_date ORDER BY transaction_date",
  "reactComponent": "function Dashboard({{ data }}) {{\\n  const [startDate, setStartDate] = useState(null);\\n  const [endDate, setEndDate] = useState(null);\\n  const filteredData = startDate && endDate ? data.filter(item => item.transaction_date >= startDate && item.transaction_date <= endDate) : data;\\n  return (\\n    <div style={{padding: '20px', height: '100%'}}>\\n      <h1 style={{marginBottom: '24px', fontSize: '24px', fontWeight: 600}}>Sales Dashboard</h1>\\n      <FilterSection title=\\"Filters\\" description=\\"Adjust date range to filter the data\\">\\n        <DateRangeFilter\\n          startDate={{startDate}}\\n          endDate={{endDate}}\\n          onStartDateChange={{setStartDate}}\\n          onEndDateChange={{setEndDate}}\\n          label=\\"Date Range\\"\\n        />\\n      </FilterSection>\\n      <ChartContainer title=\\"Sales Over Time\\" subtitle=\\"Total units sold by date\\">\\n        <ResponsiveContainer width=\\"100%\\" height=\\"100%\\">\\n          <LineChart data={{filteredData}}>\\n            <CartesianGrid strokeDasharray=\\"3 3\\" />\\n            <XAxis dataKey=\\"transaction_date\\" />\\n            <YAxis />\\n            <Tooltip />\\n            <Legend />\\n            <Line type=\\"monotone\\" dataKey=\\"total_units\\" stroke=\\"#1a5f3f\\" />\\n          </LineChart>\\n        </ResponsiveContainer>\\n      </ChartContainer>\\n    </div>\\n  );\\n}}"
}}

SIMPLE EXAMPLE (WITHOUT FILTERS):
{{
  "sql": "SELECT category, SUM(amount) as total FROM expenses GROUP BY category ORDER BY total DESC",
  "reactComponent": "function Dashboard({{ data }}) {{\\n  return (\\n    <div style={{padding: '20px', height: '100%'}}>\\n      <h1 style={{marginBottom: '24px', fontSize: '24px', fontWeight: 600}}>Expenses by Category</h1>\\n      <ChartContainer title=\\"Expenses by Category\\" subtitle=\\"Total expenses grouped by category\\">\\n        <ResponsiveContainer width=\\"100%\\" height=\\"100%\\">\\n          <BarChart data={{data}}>\\n            <CartesianGrid strokeDasharray=\\"3 3\\" />\\n            <XAxis dataKey=\\"category\\" />\\n            <YAxis />\\n            <Tooltip />\\n            <Legend />\\n            <Bar dataKey=\\"total\\" fill=\\"#1a5f3f\\" />\\n          </BarChart>\\n        </ResponsiveContainer>\\n      </ChartContainer>\\n    </div>\\n  );\\n}}"
}}

IMPORTANT: 
- Always use charts/graphs unless the user specifically asks for a table
- Choose the chart type that best represents the data structure and user's question
- The React component must be plain JavaScript with no TypeScript syntax
- Do NOT use 'export' or 'require' statements
- Ensure strict JSON formatting (escape quotes and newlines)"""

def call_llm(user_prompt: str, db_schema_ddl: str) -> str:
    """
    Call the local Ollama LLM API.
    
    Args:
        user_prompt: The user's natural language request
        db_schema_ddl: The database schema as DDL string
        
    Returns:
        Raw response text from the LLM
    """
    system_prompt = build_system_prompt()
    
    full_prompt = f"""{system_prompt}

Database Schema:
{db_schema_ddl}

User Request:
{user_prompt}

Generate the SQL query and React component. 

CRITICAL JSON FORMATTING REQUIREMENTS:
1. Use DOUBLE QUOTES (") for all property names and string values, NOT single quotes (')
2. Property names MUST be quoted: "sql" not sql or 'sql'
3. The reactComponent string must have all newlines escaped as \\n
4. All quotes inside strings must be escaped as \\"

CRITICAL DATA FIELD NAMING:
- Use the EXACT column names from your SQL SELECT query in the React component
- If your SQL uses "AS total_units", use dataKey="total_units" in the chart, NOT the original column name
- If your SQL uses "AS transaction_date", use dataKey="transaction_date" 
- ALWAYS match the column aliases from your SQL query exactly
- Example: SQL "SELECT date, SUM(units) AS total_units" means use dataKey="total_units" NOT "units"
- Date fields from PostgreSQL may be Date objects - format them as strings if needed: item.date?.toISOString()?.split('T')[0] or String(item.date)
5. Do not include any markdown formatting, code blocks, or backticks
6. Return pure, valid JSON only
7. Start your response with {{ and end with }} - no text before or after
8. Property names must be in double quotes: "sql" and "reactComponent" (not sql or reactComponent)

Example of correct format (this is EXACTLY what you should return):
{{"sql": "SELECT category, SUM(amount) as total FROM expenses GROUP BY category", "reactComponent": "function Dashboard({{ data }}) {{ return <div>...</div>; }}"}}

DO NOT include any explanation, commentary, or markdown. Return ONLY the JSON object."""

    try:
        response = httpx.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={
                "model": OLLAMA_MODEL,
                "prompt": full_prompt,
                "stream": False,
                "options": {
                    "temperature": 0.1,  # Lower temperature for more deterministic output
                }
            },
            timeout=60.0
        )
        response.raise_for_status()
        result = response.json()
        return result.get("response", "")
    except httpx.RequestError as e:
        raise Exception(f"Failed to connect to Ollama: {str(e)}")
    except httpx.HTTPStatusError as e:
        raise Exception(f"Ollama API error: {str(e)}")

def parse_llm_response(response_text: str) -> Dict[str, str]:
    """
    Parse JSON from LLM response, handling various formats and cleaning invalid characters.
    
    Args:
        response_text: Raw response from LLM
        
    Returns:
        Dictionary with 'sql' and 'reactComponent' keys
        
    Raises:
        ValueError: If JSON cannot be parsed
    """
    import re
    
    # Log the raw response for debugging (first 1000 chars)
    logger.info(f"LLM raw response (first 1000 chars): {response_text[:1000]}")
    
    try:
        # Try to find JSON object between first { and last }
        start_idx = response_text.find("{")
        end_idx = response_text.rfind("}")
        
        if start_idx == -1 or end_idx == -1:
            logger.error(f"No JSON object found. Response: {response_text[:500]}")
            raise ValueError("No JSON object found in response")
        
        json_str = response_text[start_idx:end_idx + 1]
        
        # Log the extracted JSON string for debugging
        logger.info(f"Extracted JSON string (first 500 chars): {json_str[:500]}")
        
        # Clean up common JSON issues:
        # 1. Remove invalid control characters
        json_str = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', json_str)
        
        # 2. Fix trailing commas before } or ]
        json_str = re.sub(r',(\s*[}\]])', r'\1', json_str)
        
        # 3. Fix specific LLM mistake: double quotes inside JSX style objects breaking JSON
        # style={{"padding": ... -> style={{padding: ...
        # Use a callback to handle multiple properties inside style={{...}}
        def fix_style_object(match):
            content = match.group(1)
            # Remove quotes around keys: "key": -> key:
            fixed_content = re.sub(r'"(\w+)"\s*:', r'\1:', content)
            return f'style={{{{{fixed_content}}}}}'
            
        json_str = re.sub(r'style=\{\{(.+?)\}\}', fix_style_object, json_str)
        
        # 4. Fix another case: "key": 'value' inside JSX (remove quotes around key)
        # This fixes patterns like <div style={{"height": '100%'}}> which breaks JSON
        json_str = re.sub(r'"(\w+)":\s*\'', r'\1: \'', json_str)
        
        # Try to parse the cleaned JSON first
        parsed = None
        parse_error = None
        
        try:
            parsed = json.loads(json_str)
        except json.JSONDecodeError as e:
            parse_error = e
            logger.info(f"First parse attempt failed: {str(e)}")
            logger.info(f"JSON string causing error (first 200 chars): {json_str[:200]}")
            
            # Apply more aggressive fixes only if initial parse fails
            json_str_fixed = json_str
            
            # Fix unquoted property names - handle multiple patterns
            # Pattern 1: {key: -> {"key": (at start of object)
            json_str_fixed = re.sub(r'\{(\w+):', r'{"\1":', json_str_fixed)
            
            # Pattern 2: , key: -> , "key": (after comma)
            json_str_fixed = re.sub(r',\s*(\w+):', r', "\1":', json_str_fixed)
            
            # Pattern 3: 'key': -> "key": (single quotes around property name)
            json_str_fixed = re.sub(r"'(\w+)'\s*:", r'"\1":', json_str_fixed)
            
            # Pattern 4: key: -> "key": (standalone, but be careful not to match inside strings)
            # Only match if it's at the start of a line or after { or ,
            json_str_fixed = re.sub(r'(?<=[{,\s])(\w+):', r'"\1":', json_str_fixed)
            
            logger.info(f"After aggressive fixes (first 500 chars): {json_str_fixed[:500]}")
            
            try:
                parsed = json.loads(json_str_fixed)
            except json.JSONDecodeError as e2:
                logger.info(f"Second parse attempt also failed: {str(e2)}")
                logger.info(f"Fixed JSON string (first 500 chars): {json_str_fixed[:500]}")
                
                # Try fixing common property names directly
                json_str_direct = json_str_fixed
                # Fix common property names that LLM might forget to quote
                json_str_direct = re.sub(r'\bsql\s*:', r'"sql":', json_str_direct)
                json_str_direct = re.sub(r'\breactComponent\s*:', r'"reactComponent":', json_str_direct)
                
                try:
                    parsed = json.loads(json_str_direct)
                    logger.info("Successfully parsed after direct property name fixes")
                except json.JSONDecodeError:
                    # More aggressive: replace all single quotes with double quotes
                    # This is a last resort
                    try:
                        json_str_aggressive = json_str.replace("'", '"')
                        # But we need to be careful - fix any double-double quotes
                        json_str_aggressive = json_str_aggressive.replace('""', '"')
                        # Also fix unquoted property names one more time
                        json_str_aggressive = re.sub(r'\{(\w+):', r'{"\1":', json_str_aggressive)
                        json_str_aggressive = re.sub(r',\s*(\w+):', r', "\1":', json_str_aggressive)
                        parsed = json.loads(json_str_aggressive)
                    except json.JSONDecodeError:
                        # Last resort: try to extract JSON more carefully with regex
                        json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', json_str, re.DOTALL)
                        if json_match:
                            json_str_extracted = json_match.group(0)
                            json_str_extracted = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', json_str_extracted)
                            json_str_extracted = re.sub(r',(\s*[}\]])', r'\1', json_str_extracted)
                            json_str_extracted = re.sub(r'\{(\w+):', r'{"\1":', json_str_extracted)
                            json_str_extracted = re.sub(r',\s*(\w+):', r', "\1":', json_str_extracted)
                            json_str_extracted = re.sub(r"'(\w+)'\s*:", r'"\1":', json_str_extracted)
                            parsed = json.loads(json_str_extracted)
                        else:
                            raise ValueError(f"Could not parse JSON. Original error: {str(parse_error)}. Response preview: {response_text[:200]}")
        
        # Validate required keys
        if "sql" not in parsed or "reactComponent" not in parsed:
            raise ValueError("Response missing required keys: 'sql' or 'reactComponent'")
        
        # Clean the reactComponent string - remove any remaining control characters
        react_component = str(parsed["reactComponent"])
        react_component = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', react_component)
        
        return {
            "sql": str(parsed["sql"]),
            "reactComponent": react_component
        }
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {str(e)}")
        logger.error(f"Failed JSON string (first 1000 chars): {json_str[:1000]}")
        logger.error(f"Error position: line {e.lineno}, column {e.colno}")
        # Show context around the error
        if e.pos and e.pos < len(json_str):
            start = max(0, e.pos - 50)
            end = min(len(json_str), e.pos + 50)
            logger.error(f"Context around error: ...{json_str[start:end]}...")
        raise ValueError(f"Invalid JSON in LLM response: {str(e)}")
    except Exception as e:
        logger.error(f"Parse error: {str(e)}")
        logger.error(f"Response text (first 1000 chars): {response_text[:1000]}")
        raise ValueError(f"Failed to parse LLM response: {str(e)}")

def generate_dashboard(user_prompt: str, db_schema_ddl: str) -> Dict[str, Any]:
    """
    Generate SQL and React component from user prompt.
    
    Args:
        user_prompt: Natural language request
        db_schema_ddl: Database schema DDL
        
    Returns:
        Dictionary with 'sql' and 'reactComponent' keys
    """
    response_text = call_llm(user_prompt, db_schema_ddl)
    return parse_llm_response(response_text)
