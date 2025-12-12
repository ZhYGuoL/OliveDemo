"""Database layer for schema introspection and SQL execution."""
import os
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from database_adapters import get_database_adapter, DatabaseAdapter

# Load environment variables from .env file
load_dotenv()

# Create database adapter instance (singleton pattern)
_adapter: Optional[DatabaseAdapter] = None
_current_database_url: Optional[str] = None

def set_database_url(database_url: str) -> None:
    """Set the database URL and reset the adapter to use the new connection."""
    global _adapter, _current_database_url
    _current_database_url = database_url
    _adapter = None  # Reset adapter to force recreation with new URL
    # Also set in environment for compatibility
    os.environ["DATABASE_URL"] = database_url

def clear_database_connection() -> None:
    """Clear the database connection (disconnect)."""
    global _adapter, _current_database_url
    _adapter = None
    _current_database_url = None
    # Remove from environment
    if "DATABASE_URL" in os.environ:
        del os.environ["DATABASE_URL"]

def get_current_database_url() -> Optional[str]:
    """Get the currently connected database URL."""
    return _current_database_url

def get_database_type() -> Optional[str]:
    """Get the type of the currently connected database."""
    try:
        adapter = _get_adapter()
        # Check the adapter type
        adapter_type = type(adapter).__name__
        if 'PostgreSQL' in adapter_type:
            # Check if it's Supabase by looking at the URL
            url = _current_database_url or os.getenv("DATABASE_URL", "")
            if 'supabase' in url.lower():
                return 'Supabase'
            return 'PostgreSQL'
        elif 'MySQL' in adapter_type:
            return 'MySQL'
        return 'Unknown'
    except RuntimeError:
        return None
    except Exception:
        return None

def _get_adapter() -> DatabaseAdapter:
    """Get or create the database adapter instance."""
    global _adapter, _current_database_url
    
    # Use stored connection URL as source of truth, fallback to environment variable
    database_url = _current_database_url
    if database_url is None:
        database_url = os.getenv("DATABASE_URL", None)
        if database_url:
            _current_database_url = database_url
    
    # If no connection URL is available, raise error
    if not database_url:
        raise RuntimeError("No database connected. Please connect a data source first.")
    
    # Create adapter if it doesn't exist or if URL changed
    if _adapter is None or _current_database_url != database_url:
        _adapter = get_database_adapter(database_url=database_url, db_path=None)
        _current_database_url = database_url
    
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

