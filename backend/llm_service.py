"""LLM service for generating SQL and React components."""
import os
import httpx
import json
from typing import Dict, Any

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
- The SQL query must be valid SQLite syntax
- The SQL query must ONLY use SELECT statements (no INSERT, UPDATE, DELETE, DROP, etc.)
- The React component must be a single functional component written in plain JavaScript (NOT TypeScript)
- The component should accept props as a destructured object: { data }
- Do NOT use TypeScript type annotations (no : type syntax)
- Import Recharts components using require() syntax: const { BarChart, ... } = require('recharts');
- Use ResponsiveContainer to make charts responsive
- Return ONLY valid JSON, no markdown code blocks, no backticks, no commentary
- The JSON must be valid and parseable - no control characters, no unescaped newlines in strings
- Escape all special characters properly in the reactComponent string (use \\n for newlines, \\" for quotes)
- Keep the JSON on a single line or use proper JSON formatting

EXAMPLE STRUCTURE:
{
  "sql": "SELECT category, SUM(amount) as total FROM expenses GROUP BY category ORDER BY total DESC",
  "reactComponent": "const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } = require('recharts');\nexport function Dashboard({ data }) {\n  return (\n    <div style={{ padding: '20px' }}>\n      <h2>Expenses by Category</h2>\n      <ResponsiveContainer width=\"100%\" height={400}>\n        <BarChart data={data}>\n          <CartesianGrid strokeDasharray=\"3 3\" />\n          <XAxis dataKey=\"category\" />\n          <YAxis />\n          <Tooltip />\n          <Legend />\n          <Bar dataKey=\"total\" fill=\"#1a5f3f\" />\n        </BarChart>\n      </ResponsiveContainer>\n    </div>\n  );\n}"
}

IMPORTANT: 
- Always use charts/graphs unless the user specifically asks for a table
- Choose the chart type that best represents the data structure and user's question
- The React component must be plain JavaScript with no TypeScript syntax"""

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
{"sql": "SELECT ...", "reactComponent": "export function Dashboard({ data }) { return <div>...</div>; }"}"""

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
    
    try:
        # Try to find JSON object between first { and last }
        start_idx = response_text.find("{")
        end_idx = response_text.rfind("}")
        
        if start_idx == -1 or end_idx == -1:
            raise ValueError("No JSON object found in response")
        
        json_str = response_text[start_idx:end_idx + 1]
        
        # Clean up common JSON issues:
        # 1. Remove invalid control characters
        json_str = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', json_str)
        
        # 2. Fix trailing commas before } or ]
        json_str = re.sub(r',(\s*[}\]])', r'\1', json_str)
        
        # 3. Try to fix single quotes to double quotes (but be careful with strings)
        # This is tricky - we need to replace single quotes that are property delimiters
        # but not single quotes inside string values
        # Simple approach: replace ' with " for property names and values, but this might break strings with quotes
        
        # Try to parse the cleaned JSON first
        parsed = None
        parse_error = None
        
        try:
            parsed = json.loads(json_str)
        except json.JSONDecodeError as e:
            parse_error = e
            # Try fixing common issues
            
            # Fix single quotes around property names: 'key': -> "key":
            json_str_fixed = re.sub(r"'(\w+)'\s*:", r'"\1":', json_str)
            
            # Fix single quotes around string values (but this is risky)
            # Only do this if the first attempt failed
            try:
                parsed = json.loads(json_str_fixed)
            except json.JSONDecodeError:
                # Try using ast.literal_eval as fallback for Python dict-like syntax
                try:
                    import ast
                    # Replace single quotes with double quotes more aggressively
                    json_str_aggressive = json_str.replace("'", '"')
                    parsed = json.loads(json_str_aggressive)
                except:
                    # Last resort: try to extract JSON more carefully
                    json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', json_str, re.DOTALL)
                    if json_match:
                        json_str_extracted = json_match.group(0)
                        json_str_extracted = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', json_str_extracted)
                        json_str_extracted = re.sub(r',(\s*[}\]])', r'\1', json_str_extracted)
                        json_str_extracted = re.sub(r"'(\w+)'\s*:", r'"\1":', json_str_extracted)
                        parsed = json.loads(json_str_extracted)
                    else:
                        raise ValueError(f"Could not parse JSON. Original error: {str(parse_error)}")
        
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
        raise ValueError(f"Invalid JSON in LLM response: {str(e)}")
    except Exception as e:
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

