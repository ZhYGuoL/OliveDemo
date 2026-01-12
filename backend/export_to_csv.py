"""
Export SQLite database tables to CSV files.

Usage:
    python3 export_to_csv.py
"""
import sqlite3
import pandas as pd
import os

def export_sqlite_to_csv():
    sqlite_path = "olive_demo.db"
    output_dir = "csv_exports"
    
    if not os.path.exists(sqlite_path):
        print(f"❌ Error: {sqlite_path} not found in current directory.")
        return False
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    print("--- SQLite to CSV Export Tool ---")
    print(f"Source: {sqlite_path}")
    print(f"Output directory: {output_dir}/\n")
    
    try:
        # Connect to SQLite
        conn = sqlite3.connect(sqlite_path)
        
        # Get all table names
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [r[0] for r in cursor.fetchall() if r[0] != 'sqlite_sequence']
        
        if not tables:
            print("❌ No tables found in SQLite database.")
            return False
        
        print(f"Found {len(tables)} table(s): {', '.join(tables)}\n")
        
        # Export each table to CSV
        for table in tables:
            print(f"Exporting '{table}'...")
            try:
                df = pd.read_sql_query(f"SELECT * FROM {table}", conn)
                csv_path = os.path.join(output_dir, f"{table}.csv")
                df.to_csv(csv_path, index=False)
                print(f"  ✅ Exported {len(df)} rows to {csv_path}")
            except Exception as e:
                print(f"  ❌ Error exporting {table}: {e}")
        
        conn.close()
        
        print(f"\n🎉 Export completed! CSV files are in '{output_dir}/' directory")
        print(f"\nFiles created:")
        for table in tables:
            csv_path = os.path.join(output_dir, f"{table}.csv")
            if os.path.exists(csv_path):
                size = os.path.getsize(csv_path)
                print(f"  - {table}.csv ({size:,} bytes)")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error during export: {e}")
        return False

if __name__ == "__main__":
    success = export_sqlite_to_csv()
    exit(0 if success else 1)


