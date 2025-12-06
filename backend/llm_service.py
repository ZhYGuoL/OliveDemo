"""LLM service for generating SQL and React components."""
import os
import httpx
import json
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")

def build_system_prompt() -> str:
    """Build the system prompt for the LLM."""
    return """You are an expert SQL and React developer. Your task is to generate SQL queries and React dashboard components with rich visualizations based on user requests.

Given a database schema and a user prompt, you must respond with a JSON object containing:
1. A SQL SELECT query that answers the user's question
2. A React functional component that visualizes the data with appropriate charts and graphs

AVAILABLE CHARTING LIBRARY:
You have access to Recharts library. Import it like: const { BarChart, LineChart, PieChart, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Bar, Line, Pie, Cell, Area, ResponsiveContainer } = require('recharts');

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
- Import Recharts components using require() syntax: const { BarChart, ... } = require('recharts');
- Make sure require() statements are complete with closing parenthesis and semicolon: require('recharts');
- Use ResponsiveContainer to make charts responsive
- Return ONLY valid JSON, no markdown code blocks, no backticks, no commentary
- The JSON must be valid and parseable - no control characters, no unescaped newlines in strings
- Escape all special characters properly in the reactComponent string (use \\n for newlines, \\" for quotes)
- For JSX style objects, use unquoted keys or single quotes: style={{padding: '20px'}} NOT style={{"padding": ...}}
- Keep the JSON on a single line or use proper JSON formatting

EXAMPLE STRUCTURE:
{{
  "sql": "SELECT category, SUM(amount) as total FROM expenses GROUP BY category ORDER BY total DESC",
  "reactComponent": "function Dashboard({{ data }}) {{\\n  // Recharts components are available in scope: BarChart, Bar, XAxis, YAxis, etc.\\n  return (\\n    <div style={{padding: '20px', height: '100%'}}>\\n      <h2 style={{marginBottom: '20px'}}>Expenses by Category</h2>\\n      <div style={{height: '400px', width: '100%'}}>\\n        <ResponsiveContainer width=\\"100%\\" height=\\"100%\\">\\n          <BarChart data={{data}}>\\n            <CartesianGrid strokeDasharray=\\"3 3\\" />\\n            <XAxis dataKey=\\"category\\" />\\n            <YAxis />\\n            <Tooltip />\\n            <Legend />\\n            <Bar dataKey=\\"total\\" fill=\\"#1a5f3f\\" />\\n          </BarChart>\\n        </ResponsiveContainer>\\n      </div>\\n    </div>\\n  );\\n}}"
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
5. Do not include any markdown formatting, code blocks, or backticks
6. Return pure, valid JSON only

Example of correct format:
{{"sql": "SELECT ...", "reactComponent": "function Dashboard({{ data }}) {{ return <div>...</div>; }}"}}"""

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
    
    # Log the raw response for debugging (first 500 chars)
    logger.debug(f"LLM raw response (first 500 chars): {response_text[:500]}")
    
    try:
        # Try to find JSON object between first { and last }
        start_idx = response_text.find("{")
        end_idx = response_text.rfind("}")
        
        if start_idx == -1 or end_idx == -1:
            raise ValueError("No JSON object found in response")
        
        json_str = response_text[start_idx:end_idx + 1]
        
        # Log the extracted JSON string for debugging
        logger.debug(f"Extracted JSON string (first 200 chars): {json_str[:200]}")
        
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
            logger.debug(f"First parse attempt failed: {str(e)}")
            
            # Apply more aggressive fixes only if initial parse fails
            json_str_fixed = json_str
            
            # Fix unquoted property names: {key: -> {"key":
            # Only target keys at start of line or after comma to avoid matching inside strings
            json_str_fixed = re.sub(r'^\s*\{(\w+):', r'{"\1":', json_str_fixed, flags=re.MULTILINE)
            json_str_fixed = re.sub(r',\s*(\w+):', r', "\1":', json_str_fixed)
            
            # Fix single quotes around property names: 'key': -> "key":
            json_str_fixed = re.sub(r"'(\w+)'\s*:", r'"\1":', json_str_fixed)
            
            try:
                parsed = json.loads(json_str_fixed)
            except json.JSONDecodeError:
                # More aggressive: replace all single quotes with double quotes
                # This is a last resort
                try:
                    json_str_aggressive = json_str.replace("'", '"')
                    # But we need to be careful - fix any double-double quotes
                    json_str_aggressive = json_str_aggressive.replace('""', '"')
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
        logger.error(f"Failed JSON string: {json_str}") # Log the full failed string
        raise ValueError(f"Invalid JSON in LLM response: {str(e)}")
    except Exception as e:
        logger.error(f"Parse error: {str(e)}")
        logger.error(f"Response text: {response_text[:1000]}")
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
