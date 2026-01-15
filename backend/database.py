"""Database layer for schema introspection and SQL execution with per-user session isolation."""
import os
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from database_adapters import get_database_adapter, DatabaseAdapter

# Load environment variables from .env file
load_dotenv()

# Store per-user database connections: { "user_id": { "url": str, "adapter": DatabaseAdapter, "name": str } }
_user_connections: Dict[str, Dict[str, Any]] = {}

def set_user_database(user_id: str, database_url: str, name: Optional[str] = None) -> None:
    """Set the database URL for a specific user session."""
    if user_id not in _user_connections:
        _user_connections[user_id] = {}

    # Extract name from URL if not provided
    if not name:
        try:
            from urllib.parse import urlparse
            parsed = urlparse(database_url)
            db_name = parsed.path.lstrip('/')
            name = db_name if db_name else "Database"
        except:
            name = "Database"

    _user_connections[user_id] = {
        "url": database_url,
        "adapter": None,  # Will be created on first use
        "name": name
    }

def clear_user_database(user_id: str) -> None:
    """Clear the database connection for a specific user."""
    if user_id in _user_connections:
        del _user_connections[user_id]

def get_user_database_url(user_id: str) -> Optional[str]:
    """Get the currently connected database URL for a specific user."""
    if user_id in _user_connections:
        return _user_connections[user_id]["url"]
    return None

def get_user_database_type(user_id: str) -> Optional[str]:
    """Get the type of the currently connected database for a user."""
    try:
        url = get_user_database_url(user_id)
        if not url:
            return None

        adapter = _get_user_adapter(user_id)
        adapter_type = type(adapter).__name__

        if 'PostgreSQL' in adapter_type:
            if 'supabase' in url.lower():
                return 'Supabase'
            return 'PostgreSQL'
        elif 'MySQL' in adapter_type:
            return 'MySQL'
        elif 'SQLite' in adapter_type:
            return 'SQLite'
        return 'Unknown'
    except:
        return None

def get_user_database_name(user_id: str) -> Optional[str]:
    """Get the name of the currently connected database for a user."""
    try:
        url = get_user_database_url(user_id)
        if not url:
            return None

        from urllib.parse import urlparse

        # Handle URLs with brackets in password
        url_for_parsing = url.replace('[', '%5B').replace(']', '%5D')

        try:
            parsed = urlparse(url_for_parsing)
        except:
            parsed = urlparse(url)

        hostname = parsed.hostname or ""

        # For Supabase, extract project reference ID
        if 'supabase' in url.lower():
            if 'db.' in hostname and '.supabase.co' in hostname:
                parts = hostname.split('.')
                if len(parts) >= 2:
                    project_ref = parts[1]
                    if project_ref and project_ref != 'supabase' and len(project_ref) > 3:
                        return project_ref

            if '.pooler.supabase.com' in hostname:
                parts = hostname.split('.')
                if len(parts) >= 1:
                    project_ref = parts[0]
                    if project_ref and not project_ref.startswith('aws-') and len(project_ref) > 3:
                        return project_ref

            return None

        # For other databases, use the path
        db_name = parsed.path.lstrip('/')
        if '?' in db_name:
            db_name = db_name.split('?')[0]
        if db_name:
            return db_name

        return None
    except:
        return None

def _get_user_adapter(user_id: str) -> DatabaseAdapter:
    """Get or create the database adapter instance for a specific user."""
    if user_id not in _user_connections:
        raise RuntimeError("No database connected. Please connect a data source first.")

    conn_info = _user_connections[user_id]

    # Create adapter if it doesn't exist
    if conn_info["adapter"] is None:
        conn_info["adapter"] = get_database_adapter(database_url=conn_info["url"], db_path=None)

    return conn_info["adapter"]

def get_schema_ddl(user_id: str) -> str:
    """
    Introspect the database schema and return DDL as a string for a specific user.
    Returns all CREATE TABLE statements.
    """
    adapter = _get_user_adapter(user_id)
    return adapter.get_schema_ddl()

def execute_select_query(user_id: str, sql: str, limit: int = 100) -> List[Dict[str, Any]]:
    """
    Execute a SELECT query for a specific user and return results as a list of dictionaries.

    Args:
        user_id: User identifier for session isolation
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

    # Additional safety: reject dangerous keywords
    dangerous_keywords = ["DROP", "DELETE", "UPDATE", "INSERT", "ALTER", "CREATE", "TRUNCATE",
                          "EXEC", "EXECUTE", "ATTACH", "DETACH", "PRAGMA"]
    sql_normalized = " " + sql_upper + " "
    for keyword in dangerous_keywords:
        if f" {keyword} " in sql_normalized:
            raise ValueError(f"Query contains forbidden keyword: {keyword}")

    adapter = _get_user_adapter(user_id)
    return adapter.execute_select_query(sql, limit)
