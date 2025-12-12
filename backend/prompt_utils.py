"""Utility functions for parsing table references from prompts."""
import re
from typing import List, Set

def parse_table_references(prompt: str) -> Set[str]:
    """
    Parse @table_name references from a prompt.
    Returns a set of table names (case-insensitive, normalized).
    
    Examples:
        "@users show me data" -> {"users"}
        "query @orders and @products" -> {"orders", "products"}
        "@Users table" -> {"users"} (normalized to lowercase)
    """
    # Find all @table_name patterns
    # Matches @ followed by word characters (letters, numbers, underscores)
    pattern = r'@(\w+)'
    matches = re.findall(pattern, prompt, re.IGNORECASE)
    
    # Normalize to lowercase and return unique set
    return {name.lower() for name in matches if name}

def filter_schema_by_tables(schema_ddl: str, table_names: Set[str]) -> str:
    """
    Filter schema DDL to only include CREATE TABLE statements for the specified tables.
    If table_names is empty, returns the full schema.
    
    Args:
        schema_ddl: Full schema DDL string
        table_names: Set of table names to include (case-insensitive)
    
    Returns:
        Filtered schema DDL string
    """
    if not table_names:
        return schema_ddl
    
    # Normalize table names to lowercase for comparison
    table_names_lower = {name.lower() for name in table_names}
    
    # Split schema into CREATE TABLE statements
    # Each CREATE TABLE statement ends with );
    statements = re.split(r'(CREATE TABLE[^;]+;)', schema_ddl)
    
    filtered_statements = []
    for statement in statements:
        statement = statement.strip()
        if not statement:
            continue
        
        # Check if this CREATE TABLE statement matches any of the requested tables
        if statement.upper().startswith('CREATE TABLE'):
            # Extract table name from CREATE TABLE "table_name" or CREATE TABLE table_name
            table_match = re.search(r'CREATE TABLE\s+(?:"?)(\w+)(?:"?)', statement, re.IGNORECASE)
            if table_match:
                table_name = table_match.group(1).lower()
                if table_name in table_names_lower:
                    filtered_statements.append(statement)
        else:
            # Keep non-CREATE TABLE content (comments, etc.)
            filtered_statements.append(statement)
    
    return '\n\n'.join(filtered_statements) if filtered_statements else schema_ddl

