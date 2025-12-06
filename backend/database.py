"""Database layer for schema introspection and SQL execution."""
import os
from typing import List, Dict, Any
from dotenv import load_dotenv
from database_adapters import get_database_adapter, DatabaseAdapter

# Load environment variables from .env file
load_dotenv()

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", None)

# Create database adapter instance (singleton pattern)
_adapter: DatabaseAdapter = None

def _get_adapter() -> DatabaseAdapter:
    """Get or create the database adapter instance."""
    global _adapter
    if _adapter is None:
        if not DATABASE_URL:
            raise RuntimeError("No database connected. Please connect a data source first.")
        _adapter = get_database_adapter(database_url=DATABASE_URL, db_path=None)
    return _adapter

def get_schema_ddl() -> str:
    """
    Introspect the database schema and return DDL as a string.
    Returns all CREATE TABLE statements.
    """
    adapter = _get_adapter()
    return adapter.get_schema_ddl()

def execute_select_query(sql: str, limit: int = 100) -> List[Dict[str, Any]]:
    """
    Execute a SELECT query and return results as a list of dictionaries.
    
    Args:
        sql: SQL SELECT query string
        limit: Maximum number of rows to return
        
    Returns:
        List of dictionaries where keys are column names
        
    Raises:
        ValueError: If SQL is not a SELECT query or execution fails
    """
    # Safety check: ensure it's a SELECT query
    sql_upper = sql.strip().upper()
    if not sql_upper.startswith("SELECT"):
        raise ValueError("Only SELECT queries are allowed")
    
    # Additional safety: reject dangerous keywords (check for keywords that could be used maliciously)
    dangerous_keywords = ["DROP", "DELETE", "UPDATE", "INSERT", "ALTER", "CREATE", "TRUNCATE", 
                          "EXEC", "EXECUTE", "ATTACH", "DETACH", "PRAGMA"]
    sql_normalized = " " + sql_upper + " "  # Add spaces for safer keyword detection
    for keyword in dangerous_keywords:
        if f" {keyword} " in sql_normalized:
            raise ValueError(f"Query contains forbidden keyword: {keyword}")
    
    adapter = _get_adapter()
    return adapter.execute_select_query(sql, limit)

