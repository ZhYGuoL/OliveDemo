"""View database entries in a readable format."""
import sqlite3
import os
from datetime import datetime

# Database path relative to backend directory
_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(_BACKEND_DIR, "olive_demo.db")

def view_database():
    """Display all entries from the database."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Get table names
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cursor.fetchall()
    
    print("=" * 80)
    print("DATABASE CONTENTS")
    print("=" * 80)
    print(f"Database: {DB_PATH}\n")
    
    for (table_name,) in tables:
        print(f"\n📊 Table: {table_name}")
        print("-" * 80)
        
        # Get row count
        cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
        count = cursor.fetchone()[0]
        print(f"Total rows: {count}\n")
        
        # Get all rows
        cursor.execute(f"SELECT * FROM {table_name}")
        rows = cursor.fetchall()
        
        if rows:
            # Print column headers
            columns = [description[0] for description in cursor.description]
            header = " | ".join(f"{col:15}" for col in columns)
            print(header)
            print("-" * len(header))
            
            # Print rows
            for row in rows:
                values = []
                for col in columns:
                    value = row[col]
                    if value is None:
                        values.append(f"{'NULL':15}")
                    elif isinstance(value, float):
                        values.append(f"{value:15.2f}")
                    else:
                        values.append(f"{str(value):15}")
                print(" | ".join(values))
        else:
            print("(No data)")
        
        print()
    
    conn.close()

if __name__ == "__main__":
    view_database()

