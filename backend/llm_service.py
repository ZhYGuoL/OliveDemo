"""LLM service for generating SQL and React components."""
import os
import json
import logging
from typing import Dict, Any
import google.generativeai as genai

logger = logging.getLogger(__name__)

# Configure Google AI Studio
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
else:
    logger.warning("GOOGLE_API_KEY not set. LLM functionality will not work.")

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
    4. IMPORTANT: In SQL queries, ALL column names and table names MUST be wrapped in double quotes to handle case-sensitivity (e.g., SELECT "Column_Name" FROM "table_name"). This is critical for PostgreSQL/Supabase databases.
    5. CRITICAL: When performing math operations or aggregations (SUM, AVG, etc.) on columns that are TEXT type in the schema, you MUST cast them to numeric first using ::numeric or ::integer. Example: SUM("Clicks"::integer), AVG("Revenue"::numeric). Check the schema data types carefully!
    6. CRITICAL: When aggregating data (SUM, AVG, COUNT, etc.) or grouping "by category", "by region", etc., you MUST use GROUP BY clause. For example: SELECT "Category", AVG("Revenue") AS avg_revenue FROM "table" GROUP BY "Category"
    7. For KPI widgets showing totals/aggregates (e.g., "total revenue", "total users"), the SQL MUST use aggregation functions (SUM, COUNT, AVG, etc.) to return a single aggregated value. Example: SELECT SUM("Revenue") AS total_revenue FROM "table". Never use LIMIT 1 for aggregations - use proper aggregate functions.
    8. For Charts (BarChart, PieChart, etc.), if showing data by categories/groups, use GROUP BY to return one row per category, not individual transaction rows.
    9. For Charts, ensure xField and yField exist in the SQL SELECT columns.
    10. For PieChart widgets, use "valueField" instead of "yField" to specify the data column.
    11. If the user asks for a date filter, add a widget with type "Filter" and filterType "dateRange", and list the IDs of the charts it should affect in "targetWidgetIds".
    12. CRITICAL: For ranking/top-N queries (e.g., "top-selling products", "best customers", "highest revenue categories"), you MUST:
        - Use ORDER BY to sort by the ranking metric in DESC order (e.g., ORDER BY revenue DESC)
        - Use LIMIT to show only the top N items (typically 10-15 for charts, 5-10 for pie charts)
        - Example: SELECT "Product", SUM("Revenue"::numeric) AS revenue FROM "sales" GROUP BY "Product" ORDER BY revenue DESC LIMIT 10
        - This ensures charts are readable and actually show the "top" items, not all items
    13. Return ONLY valid JSON. No markdown, no backticks, no commentary.
    """

def call_llm(user_prompt: str, db_schema_ddl: str, referenced_tables: set = None) -> str:
    """
    Call the Google AI Studio (Gemini) API.
    """
    system_prompt = build_system_prompt()

    # Build context about referenced tables
    table_context = ""
    if referenced_tables:
        table_list = ", ".join(sorted(referenced_tables))
        table_context = f"\nNOTE: The user specifically referenced these tables: {table_list}. Focus on these tables in your queries.\n"

    full_prompt = f"""{system_prompt}

Database Schema:
{db_schema_ddl}
{table_context}
User Request:
{user_prompt}

Generate the Dashboard JSON spec.
"""

    try:
        model = genai.GenerativeModel(GEMINI_MODEL)

        # Configure generation parameters
        generation_config = {
            "temperature": 0.1,
            "top_p": 0.95,
            "top_k": 40,
            "max_output_tokens": 8192,
        }

        response = model.generate_content(
            full_prompt,
            generation_config=generation_config
        )

        return response.text
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

def generate_dashboard(user_prompt: str, db_schema_ddl: str, referenced_tables: set = None) -> Dict[str, Any]:
    """
    Generate dashboard spec.
    """
    response_text = call_llm(user_prompt, db_schema_ddl, referenced_tables)
    return parse_llm_response(response_text)

def generate_dashboard_suggestions(db_schema_ddl: str, table_names: list = None) -> list:
    """
    Generate dashboard suggestions based on database schema.
    Returns a list of suggestion objects with title, description, and prompt.
    """
    system_prompt = """You are an expert data analyst. Based on the provided database schema, generate exactly 4 relevant dashboard suggestions that would be useful for this database.

For each suggestion, provide:
- A clear, descriptive title
- A detailed description (2-3 sentences) explaining what the dashboard does, who would use it, and the business value it provides
- A list of 4-5 specific, actionable features/capabilities
- A list of table names (without @ prefix) that would be used for this dashboard
- A natural language prompt that could be used to generate this dashboard

IMPORTANT: In the prompt field, prefix all table names with @ symbol (e.g., @users, @orders, @products). This allows them to be recognized as table references in the interface.

Focus on practical, actionable dashboards that provide real business value. Make suggestions specific to the actual schema provided. Consider:
- User management and authentication
- Sales and revenue analytics
- Product performance tracking
- Customer behavior analysis
- Operational monitoring
- Inventory and supply chain

Return ONLY a valid JSON array of exactly 4 objects with this structure:
[
  {
    "title": "Dashboard Title",
    "description": "Detailed 2-3 sentence description of what this dashboard does, who would use it, and the business value it provides.",
    "features": [
      "Specific feature 1",
      "Specific feature 2",
      "Specific feature 3",
      "Specific feature 4"
    ],
    "tables": ["table1", "table2", "table3"],
    "prompt": "Natural language prompt with @table references"
  }
]

Return ONLY the JSON array with exactly 4 suggestions. No markdown, no backticks, no commentary."""

    # Build context about tables
    table_context = ""
    if table_names:
        table_list = ", ".join(table_names)
        table_context = f"\n\nAvailable tables: {table_list}\nFocus your suggestions on these tables and their relationships.\n"

    full_prompt = f"""{system_prompt}

Database Schema:
{db_schema_ddl}
{table_context}

Generate exactly 4 dashboard suggestions as a JSON array.
"""

    try:
        model = genai.GenerativeModel(GEMINI_MODEL)

        # Configure generation parameters with higher temperature for varied suggestions
        generation_config = {
            "temperature": 0.8,
            "top_p": 0.95,
            "top_k": 40,
            "max_output_tokens": 8192,
        }

        response = model.generate_content(
            full_prompt,
            generation_config=generation_config
        )

        response_text = response.text

        # Parse JSON array from response
        import re
        start_idx = response_text.find("[")
        end_idx = response_text.rfind("]")

        if start_idx == -1 or end_idx == -1:
            logger.warning("No JSON array found in suggestions response, returning defaults")
            return get_default_suggestions(table_names)

        json_str = response_text[start_idx:end_idx + 1]
        json_str = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', json_str)

        suggestions = json.loads(json_str)

        # Validate and ensure we have suggestions
        if not isinstance(suggestions, list) or len(suggestions) == 0:
            return get_default_suggestions(table_names)

        return suggestions[:4]  # Limit to exactly 4 suggestions

    except Exception as e:
        logger.error(f"Failed to generate suggestions: {e}")
        return get_default_suggestions(table_names)

def get_default_suggestions(table_names: list = None) -> list:
    """Return default suggestions if LLM fails. Always returns exactly 4 suggestions."""
    # Get first few table names with @ prefix for prompts
    table_refs = [f"@{t}" for t in (table_names[:3] if table_names else [])]

    if table_names and len(table_names) > 0:
        # Create table-specific suggestions when we have table names
        table_name = table_names[0]
        table_ref = f"@{table_name}"

        defaults = [
            {
                "title": f"{table_name.title()} Analytics",
                "description": f"Analyze and visualize data from the {table_name} table with charts and metrics.",
                "features": [
                    f"View all {table_name} records",
                    "Create visualizations of key metrics",
                    "Filter and search data"
                ],
                "tables": [table_name],
                "prompt": f"Build a dashboard to analyze and visualize data from {table_ref}"
            },
            {
                "title": "Data Overview Dashboard",
                "description": "Get a comprehensive overview of your data with key metrics and visualizations.",
                "features": [
                    "View total records across all tables",
                    "See data distribution and trends",
                    "Monitor data growth over time"
                ],
                "tables": table_names[:3] if table_names else [],
                "prompt": f"Build a dashboard showing an overview of {' '.join(table_refs)} with key metrics and charts" if table_refs else "Build a dashboard showing an overview of all my data with key metrics and charts"
            },
            {
                "title": "Table Explorer",
                "description": "Explore and analyze data from your tables with search and filter capabilities.",
                "features": [
                    "Browse all tables and their data",
                    "Search and filter records",
                    "View table relationships"
                ],
                "tables": [table_name],
                "prompt": f"Create a table to view and search through {table_ref}"
            },
            {
                "title": "Quick Stats Summary",
                "description": "Display key statistics and counts from your most important tables.",
                "features": [
                    "Show record counts by table",
                    "Display key performance indicators",
                    "Visualize data distribution"
                ],
                "tables": table_names[:3] if table_names else [],
                "prompt": f"Show me statistics and counts from {' and '.join(table_refs)}" if table_refs else "Create a dashboard with quick statistics and counts from my database tables"
            }
        ]
    else:
        # Generic defaults when no table names are available
        defaults = [
            {
                "title": "Data Overview Dashboard",
                "description": "Get a comprehensive overview of your data with key metrics and visualizations.",
                "features": [
                    "View total records across all tables",
                    "See data distribution and trends",
                    "Monitor data growth over time"
                ],
                "tables": [],
                "prompt": "Build a dashboard showing an overview of all my data with key metrics and charts"
            },
            {
                "title": "Table Explorer",
                "description": "Explore and analyze data from your tables with search and filter capabilities.",
                "features": [
                    "Browse all tables and their data",
                    "Search and filter records",
                    "View table relationships"
                ],
                "tables": [],
                "prompt": "Create a table explorer to view and search through all my database tables"
            },
            {
                "title": "Recent Activity Monitor",
                "description": "Track and monitor recent changes and activities across your database.",
                "features": [
                    "View recent record additions",
                    "Monitor update patterns",
                    "Track data changes over time"
                ],
                "tables": [],
                "prompt": "Build a dashboard to monitor recent activity and changes in my database"
            },
            {
                "title": "Quick Stats Summary",
                "description": "Display key statistics and counts from your most important tables.",
                "features": [
                    "Show record counts by table",
                    "Display key performance indicators",
                    "Visualize data distribution"
                ],
                "tables": [],
                "prompt": "Create a dashboard with quick statistics and counts from my database tables"
            }
        ]

    return defaults[:4]  # Ensure exactly 4 suggestions
