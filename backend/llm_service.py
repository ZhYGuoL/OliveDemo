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
    return """You are an expert data analyst and dashboard designer. Your task is to generate a structured JSON specification for a dashboard based on a user's request and database schema.

    You must output ONLY a valid JSON object matching this structure:

    {
      "type": "Dashboard",
      "title": "Dashboard Title",
      "layout": {
        "type": "Grid",
        "columns": 3
      },
      "widgets": [
        {
          "id": "unique_id_1",
          "type": "KPI" | "BarChart" | "LineChart" | "AreaChart" | "PieChart" | "Table" | "Filter",
          "title": "Widget Title",
          "description": "Optional description",
          "dataSource": "source_id_1",
          // Type-specific properties:
          "valueField": "column_name", // For KPI
          "trendField": "column_name", // For KPI (optional)
          "xField": "column_name", // For Charts
          "yField": "column_name", // For Charts
          // Filter specific properties:
          "filterType": "dateRange", // Only if type is "Filter"
          "targetWidgetIds": ["unique_id_1", "unique_id_2"] // IDs of widgets this filter affects
        }
      ],
      "dataSources": [
        {
          "id": "source_id_1",
          "sql": "SELECT ...",
          "primaryKey": "id_column"
        }
      ]
    }

    RULES:
    1. "type" must be one of: KPI, BarChart, LineChart, AreaChart, PieChart, Table, Filter.
    2. "dataSource" in a widget must match an "id" in the "dataSources" array (except for Filter widgets which don't need a dataSource).
    3. SQL queries must be valid for the provided schema.
    4. For KPI widgets, the SQL should return a single row (or use LIMIT 1).
    5. For Charts, ensure xField and yField exist in the SQL SELECT columns.
    6. If the user asks for a date filter, add a widget with type "Filter" and filterType "dateRange", and list the IDs of the charts it should affect in "targetWidgetIds".
    7. Return ONLY valid JSON. No markdown, no backticks, no commentary.
    """

def call_llm(user_prompt: str, db_schema_ddl: str) -> str:
    """
    Call the local Ollama LLM API.
    """
    system_prompt = build_system_prompt()
    
    full_prompt = f"""{system_prompt}

Database Schema:
{db_schema_ddl}

User Request:
{user_prompt}

Generate the Dashboard JSON spec.
"""

    try:
        response = httpx.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={
                "model": OLLAMA_MODEL,
                "prompt": full_prompt,
                "stream": False,
                "options": {
                    "temperature": 0.1,
                }
            },
            timeout=60.0
        )
        response.raise_for_status()
        result = response.json()
        return result.get("response", "")
    except Exception as e:
        logger.error(f"LLM call failed: {e}")
        raise

def parse_llm_response(response_text: str) -> Dict[str, Any]:
    """
    Parse JSON from LLM response.
    """
    import re
    
    logger.info(f"LLM raw response: {response_text[:1000]}")
    
    try:
        # Extract JSON object
        start_idx = response_text.find("{")
        end_idx = response_text.rfind("}")
        
        if start_idx == -1 or end_idx == -1:
            raise ValueError("No JSON object found")
            
        json_str = response_text[start_idx:end_idx + 1]
        
        # Clean control characters
        json_str = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', json_str)
        
        return json.loads(json_str)
    except Exception as e:
        logger.error(f"JSON parse error: {e}")
        # Return a fallback error spec if parsing fails
        return {
            "type": "Dashboard",
            "title": "Error Generating Dashboard",
            "layout": {"type": "Grid", "columns": 1},
            "widgets": [],
            "dataSources": []
        }

def generate_dashboard(user_prompt: str, db_schema_ddl: str) -> Dict[str, Any]:
    """
    Generate dashboard spec.
    """
    response_text = call_llm(user_prompt, db_schema_ddl)
    return parse_llm_response(response_text)
