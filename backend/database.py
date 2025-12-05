"""Database layer for schema introspection and SQL execution."""
import sqlite3
import os
from typing import List, Dict, Any

# Database path relative to backend directory
_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.getenv("DB_PATH", os.path.join(_BACKEND_DIR, "olive_demo.db"))

def get_schema_ddl() -> str:
    """
    Introspect the database schema and return DDL as a string.
    Returns all CREATE TABLE statements.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Get all table names
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cursor.fetchall()
    
    ddl_parts = []
    for (table_name,) in tables:
        # Get CREATE TABLE statement (using parameterized query for safety)
        cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name=?", (table_name,))
        result = cursor.fetchone()
        if result and result[0]:
            ddl_parts.append(result[0])
    
    conn.close()
    return "\n\n".join(ddl_parts)

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
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Enable column access by name
    cursor = conn.cursor()
    
    try:
        # Apply limit if not already present
        if "LIMIT" not in sql_upper:
            sql_with_limit = f"{sql.rstrip(';')} LIMIT {limit}"
        else:
            sql_with_limit = sql
        
        cursor.execute(sql_with_limit)
        rows = cursor.fetchall()
        
        # Convert to list of dictionaries
        result = [dict(row) for row in rows]
        
        conn.close()
        return result
    except sqlite3.Error as e:
        conn.close()
        raise ValueError(f"SQL execution failed: {str(e)}")

