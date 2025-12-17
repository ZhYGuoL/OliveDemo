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

# Store multiple connections: { "connection_id": "database_url" }
_connections: Dict[str, str] = {}
_connection_names: Dict[str, str] = {}  # Optional: store user-friendly names

def add_connection(database_url: str, name: Optional[str] = None) -> str:
    """Add a new database connection and return its ID."""
    import hashlib
    # Generate a simple ID based on the URL
    connection_id = hashlib.md5(database_url.encode()).hexdigest()
    _connections[connection_id] = database_url
    
    # Store name or generate one from the URL if not provided
    if name:
        _connection_names[connection_id] = name
    else:
        # Try to extract a meaningful name
        try:
            from urllib.parse import urlparse
            parsed = urlparse(database_url)
            db_name = parsed.path.lstrip('/')
            if not db_name:
                db_name = "Database"
            _connection_names[connection_id] = db_name
        except:
            _connection_names[connection_id] = "Database"
            
    return connection_id

def get_connections() -> List[Dict[str, str]]:
    """Get all saved connections."""
    return [
        {"id": cid, "url": url, "name": _connection_names.get(cid, "Database")}
        for cid, url in _connections.items()
    ]

def switch_connection(connection_id: str) -> bool:
    """Switch the active connection to the specified ID."""
    if connection_id in _connections:
        set_database_url(_connections[connection_id])
        return True
    return False

def set_database_url(database_url: str) -> None:
    """Set the database URL and reset the adapter to use the new connection."""
    global _adapter, _current_database_url
    
    # Check if this URL is already saved, if not add it
    import hashlib
    connection_id = hashlib.md5(database_url.encode()).hexdigest()
    if connection_id not in _connections:
        add_connection(database_url)
        
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

def get_database_name() -> Optional[str]:
    """Get the name of the currently connected database."""
    try:
        from urllib.parse import urlparse, unquote
        url = _current_database_url or os.getenv("DATABASE_URL", "")
        if not url:
            return None
        
        # Handle URLs with brackets in password (e.g., [PASSWORD])
        # Replace brackets temporarily for parsing
        url_for_parsing = url.replace('[', '%5B').replace(']', '%5D')
        
        try:
            parsed = urlparse(url_for_parsing)
        except Exception:
            # Fallback: try parsing original URL
            parsed = urlparse(url)
        
        hostname = parsed.hostname or ""
        
        # For Supabase, extract project reference ID from hostname
        if 'supabase' in url.lower():
            # Supabase hostname formats:
            # - db.xxxxx.supabase.co (direct connection)
            # - xxxxx.pooler.supabase.com (pooled connection)
            # - aws-0-us-west-1.pooler.supabase.com (pooled with region)
            
            # Try direct connection format: db.xxxxx.supabase.co
            if 'db.' in hostname and '.supabase.co' in hostname:
                parts = hostname.split('.')
                if len(parts) >= 2:
                    project_ref = parts[1]  # The part after 'db.'
                    if project_ref and project_ref != 'supabase' and len(project_ref) > 3:
                        return project_ref
            
            # Try pooled connection format: xxxxx.pooler.supabase.com
            if '.pooler.supabase.com' in hostname:
                parts = hostname.split('.')
                if len(parts) >= 1:
                    project_ref = parts[0]  # The first part
                    # Skip AWS region prefixes
                    if project_ref and not project_ref.startswith('aws-') and len(project_ref) > 3:
                        return project_ref
            
            # If we couldn't extract from URL, try querying the database
            try:
                adapter = _get_adapter()
                conn = adapter.connect()
                cursor = conn.cursor()
                cursor.execute("SELECT current_database()")
                db_name = cursor.fetchone()[0]
                cursor.close()
                conn.close()
                # For Supabase, if it's "postgres", try to get project ref from connection info
                if db_name == "postgres":
                    # Try to extract from URL one more time using regex
                    import re
                    match = re.search(r'db\.([a-z0-9]+)\.supabase\.co', url.lower())
                    if match:
                        return match.group(1)
                    return None
                return db_name
            except Exception:
                pass
            
            # Last resort: return None (frontend won't show database name)
            return None
        
        # For other databases, use the path (database name)
        db_name = parsed.path.lstrip('/')
        # Remove any query parameters or fragments
        if '?' in db_name:
            db_name = db_name.split('?')[0]
        if db_name:
            return db_name
        
        # Fallback: try querying the database directly
        try:
            adapter = _get_adapter()
            conn = adapter.connect()
            cursor = conn.cursor()
            cursor.execute("SELECT current_database()")
            db_name = cursor.fetchone()[0]
            cursor.close()
            conn.close()
            return db_name
        except Exception:
            return None
    except Exception as e:
        import logging
        logging.error(f"Error getting database name: {e}")
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

