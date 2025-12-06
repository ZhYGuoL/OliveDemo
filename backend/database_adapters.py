"""Database adapter implementations for different database types."""
import os
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from urllib.parse import urlparse

# Try to import database adapters
try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    PSYCOPG2_AVAILABLE = True
except ImportError:
    PSYCOPG2_AVAILABLE = False

try:
    import pymysql
    PYMySQL_AVAILABLE = True
except ImportError:
    PYMySQL_AVAILABLE = False


class DatabaseAdapter(ABC):
    """Abstract base class for database adapters."""
    
    @abstractmethod
    def connect(self):
        """Create and return a database connection."""
        pass
    
    @abstractmethod
    def get_schema_ddl(self) -> str:
        """Introspect the database schema and return DDL as a string."""
        pass
    
    @abstractmethod
    def execute_select_query(self, sql: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Execute a SELECT query and return results as a list of dictionaries."""
        pass
    
    @abstractmethod
    def get_parameter_style(self) -> str:
        """Return the parameter style: '%s' for PostgreSQL/MySQL."""
        pass
    
    @abstractmethod
    def get_table_creation_sql(self, table_name: str, columns: List[Dict]) -> str:
        """Generate CREATE TABLE SQL for initialization."""
        pass


class PostgreSQLAdapter(DatabaseAdapter):
    """Adapter for PostgreSQL databases (also works for Supabase)."""
    
    def __init__(self, database_url: str):
        if not PSYCOPG2_AVAILABLE:
            raise RuntimeError("psycopg2-binary is required for PostgreSQL. Install it with: pip install psycopg2-binary")
        self.database_url = database_url
    
    def connect(self):
        # Add connection timeout to prevent hanging
        return psycopg2.connect(self.database_url, connect_timeout=5)
    
    def get_schema_ddl(self) -> str:
        """Introspect PostgreSQL schema."""
        conn = self.connect()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        """)
        tables = cursor.fetchall()
        
        ddl_parts = []
        for (table_name,) in tables:
            # Get column information
            cursor.execute("""
                SELECT 
                    column_name,
                    data_type,
                    character_maximum_length,
                    is_nullable,
                    column_default
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = %s
                ORDER BY ordinal_position
            """, (table_name,))
            columns = cursor.fetchall()
            
            # Build CREATE TABLE statement
            col_defs = []
            for col_name, data_type, max_length, is_nullable, default in columns:
                col_def = f'    "{col_name}" {data_type}'
                if max_length:
                    col_def += f"({max_length})"
                if is_nullable == "NO":
                    col_def += " NOT NULL"
                if default:
                    col_def += f" DEFAULT {default}"
                col_defs.append(col_def)
            
            # Get primary key
            cursor.execute("""
                SELECT column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                    ON tc.constraint_name = kcu.constraint_name
                WHERE tc.table_schema = 'public' 
                    AND tc.table_name = %s
                    AND tc.constraint_type = 'PRIMARY KEY'
            """, (table_name,))
            pk_cols = [row[0] for row in cursor.fetchall()]
            
            if pk_cols:
                pk_str = ", ".join([f'"{c}"' for c in pk_cols])
                col_defs.append(f'    PRIMARY KEY ({pk_str})')
            
            ddl = f'CREATE TABLE "{table_name}" (\n' + ",\n".join(col_defs) + "\n);"
            ddl_parts.append(ddl)
        
        conn.close()
        return "\n\n".join(ddl_parts)
    
    def execute_select_query(self, sql: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Execute SELECT query on PostgreSQL."""
        conn = self.connect()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        try:
            sql_upper = sql.strip().upper()
            if "LIMIT" not in sql_upper:
                sql_with_limit = f"{sql.rstrip(';')} LIMIT {limit}"
            else:
                sql_with_limit = sql
            
            cursor.execute(sql_with_limit)
            rows = cursor.fetchall()
            result = [dict(row) for row in rows]
            
            conn.close()
            return result
        except Exception as e:
            conn.close()
            raise ValueError(f"SQL execution failed: {str(e)}")
    
    def get_parameter_style(self) -> str:
        return "%s"
    
    def get_table_creation_sql(self, table_name: str, columns: List[Dict]) -> str:
        """Generate PostgreSQL CREATE TABLE SQL."""
        col_defs = []
        for col in columns:
            col_def = f'    "{col["name"]}" {col["type"]}'
            if col.get('not_null'):
                col_def += " NOT NULL"
            if col.get('primary_key'):
                col_def += " PRIMARY KEY"
            col_defs.append(col_def)
        
        return f'CREATE TABLE IF NOT EXISTS "{table_name}" (\n' + ",\n".join(col_defs) + "\n)"


class MySQLAdapter(DatabaseAdapter):
    """Adapter for MySQL databases."""
    
    def __init__(self, database_url: str):
        if not PYMySQL_AVAILABLE:
            raise RuntimeError("PyMySQL is required for MySQL. Install it with: pip install pymysql")
        self.database_url = database_url
        self._parse_url()
    
    def _parse_url(self):
        """Parse MySQL connection URL."""
        parsed = urlparse(self.database_url)
        self.host = parsed.hostname or "localhost"
        self.port = parsed.port or 3306
        self.user = parsed.username
        self.password = parsed.password
        self.database = parsed.path.lstrip("/")
    
    def connect(self):
        return pymysql.connect(
            host=self.host,
            port=self.port,
            user=self.user,
            password=self.password,
            database=self.database,
            cursorclass=pymysql.cursors.DictCursor
        )
    
    def get_schema_ddl(self) -> str:
        """Introspect MySQL schema."""
        conn = self.connect()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = DATABASE()
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        """)
        tables = cursor.fetchall()
        
        ddl_parts = []
        for table in tables:
            table_name = table['table_name']
            
            # Get column information
            cursor.execute("""
                SELECT 
                    column_name,
                    data_type,
                    character_maximum_length,
                    is_nullable,
                    column_default,
                    extra
                FROM information_schema.columns
                WHERE table_schema = DATABASE() AND table_name = %s
                ORDER BY ordinal_position
            """, (table_name,))
            columns = cursor.fetchall()
            
            # Build CREATE TABLE statement
            col_defs = []
            for col in columns:
                col_def = f'    `{col["column_name"]}` {col["data_type"]}'
                if col['character_maximum_length']:
                    col_def += f"({col['character_maximum_length']})"
                if col['is_nullable'] == "NO":
                    col_def += " NOT NULL"
                if col['column_default'] is not None:
                    col_def += f" DEFAULT {col['column_default']}"
                if 'auto_increment' in col['extra'].lower():
                    col_def += " AUTO_INCREMENT"
                col_defs.append(col_def)
            
            # Get primary key
            cursor.execute("""
                SELECT column_name
                FROM information_schema.key_column_usage
                WHERE table_schema = DATABASE()
                    AND table_name = %s
                    AND constraint_name = 'PRIMARY'
            """, (table_name,))
            pk_cols = [row['column_name'] for row in cursor.fetchall()]
            
            if pk_cols:
                col_defs.append(f'    PRIMARY KEY (`{"`, `".join(pk_cols)}`)')
            
            ddl = f'CREATE TABLE `{table_name}` (\n' + ",\n".join(col_defs) + "\n);"
            ddl_parts.append(ddl)
        
        conn.close()
        return "\n\n".join(ddl_parts)
    
    def execute_select_query(self, sql: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Execute SELECT query on MySQL."""
        conn = self.connect()
        cursor = conn.cursor()
        
        try:
            sql_upper = sql.strip().upper()
            if "LIMIT" not in sql_upper:
                sql_with_limit = f"{sql.rstrip(';')} LIMIT {limit}"
            else:
                sql_with_limit = sql
            
            cursor.execute(sql_with_limit)
            rows = cursor.fetchall()
            result = [dict(row) for row in rows]
            
            conn.close()
            return result
        except Exception as e:
            conn.close()
            raise ValueError(f"SQL execution failed: {str(e)}")
    
    def get_parameter_style(self) -> str:
        return "%s"
    
    def get_table_creation_sql(self, table_name: str, columns: List[Dict]) -> str:
        """Generate MySQL CREATE TABLE SQL."""
        col_defs = []
        for col in columns:
            col_def = f'    `{col["name"]}` {col["type"]}'
            if col.get('not_null'):
                col_def += " NOT NULL"
            if col.get('primary_key'):
                col_def += " PRIMARY KEY AUTO_INCREMENT"
            col_defs.append(col_def)
        
        return f'CREATE TABLE IF NOT EXISTS `{table_name}` (\n' + ",\n".join(col_defs) + "\n)"


def get_database_adapter(database_url: Optional[str] = None, db_path: Optional[str] = None) -> DatabaseAdapter:
    """
    Factory function to create the appropriate database adapter.
    
    Args:
        database_url: Connection URL (e.g., postgresql://..., mysql://...)
        db_path: Deprecated parameter, not used
    
    Returns:
        DatabaseAdapter instance
    
    Raises:
        ValueError: If database_url is not provided or unsupported
    """
    if not database_url:
        raise ValueError("DATABASE_URL is required. Please connect a data source (PostgreSQL, Supabase, or MySQL).")
    
    parsed = urlparse(database_url)
    scheme = parsed.scheme.lower()
    
    if scheme.startswith("postgres"):
        return PostgreSQLAdapter(database_url)
    elif scheme.startswith("mysql"):
        return MySQLAdapter(database_url)
    else:
        raise ValueError(f"Unsupported database URL scheme: {scheme}. Supported: postgresql://, mysql://")

