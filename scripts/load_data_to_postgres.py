"""Load Kaggle e-commerce dataset into PostgreSQL."""
import os
import pandas as pd
from pathlib import Path
from sqlalchemy import create_engine, text
import sys

# Add parent directory to path to import database adapters
sys.path.insert(0, str(Path(__file__).parent.parent))

def load_data_to_postgres():
    """Load CSV files from Kaggle dataset into PostgreSQL."""
    
    # Connection details
    conn_string = "postgresql://postgres:postgres@localhost:5433/ecommerce"
    
    data_dir = Path("data/kaggle")
    
    if not data_dir.exists():
        print(f"❌ Data directory not found: {data_dir}")
        print("Please run download_kaggle_dataset.py first")
        return
    
    # Find all CSV files
    csv_files = list(data_dir.glob("*.csv"))
    
    if not csv_files:
        print(f"❌ No CSV files found in {data_dir}")
        return
    
    print(f"📊 Found {len(csv_files)} CSV files")
    
    try:
        # Create SQLAlchemy engine for PostgreSQL
        engine = create_engine(conn_string)
        
        for csv_file in csv_files:
            table_name = csv_file.stem.lower().replace(" ", "_").replace("-", "_")
            
            print(f"\n📥 Loading {csv_file.name} into table '{table_name}'...")
            
            # Read CSV in chunks to handle large files
            chunk_size = 10000
            total_rows = 0
            
            # Drop table if exists
            with engine.connect() as conn:
                conn.execute(text(f"DROP TABLE IF EXISTS {table_name} CASCADE"))
                conn.commit()
            
            # Read and load data in chunks
            for chunk_num, chunk in enumerate(pd.read_csv(csv_file, chunksize=chunk_size, low_memory=False), 1):
                # Clean column names
                chunk.columns = [col.lower().replace(" ", "_").replace("-", "_") for col in chunk.columns]
                
                # Load chunk into database
                chunk.to_sql(
                    table_name,
                    engine,
                    if_exists='append',
                    index=False,
                    method='multi'
                )
                
                total_rows += len(chunk)
                print(f"  ✓ Loaded chunk {chunk_num}: {len(chunk)} rows (total: {total_rows:,})")
            
            # Get final row count
            with engine.connect() as conn:
                result = conn.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
                count = result.scalar()
                print(f"  ✅ Table '{table_name}' loaded with {count:,} rows")
        
        engine.dispose()
        
        print("\n✅ All data loaded successfully!")
        print("\nTables created:")
        
        # List all tables
        engine = create_engine(conn_string)
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name;
            """))
            tables = result.fetchall()
            for (table_name,) in tables:
                result = conn.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
                count = result.scalar()
                print(f"  - {table_name}: {count:,} rows")
        engine.dispose()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    load_data_to_postgres()

