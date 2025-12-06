"""Initialize the database (PostgreSQL, Supabase, or MySQL) with schema and sample data."""
import os
from datetime import datetime, timedelta
import random
from dotenv import load_dotenv
from database_adapters import get_database_adapter, DatabaseAdapter

# Load environment variables from .env file
load_dotenv()

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", None)

def init_database():
    """Create database schema and seed with sample data."""
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL is required. Please set it as an environment variable or connect via the UI.")
    
    adapter = get_database_adapter(database_url=DATABASE_URL, db_path=None)
    conn = adapter.connect()
    cursor = conn.cursor()
    param_style = adapter.get_parameter_style()
    
    # Determine database type for SQL syntax
    from urllib.parse import urlparse
    parsed = urlparse(DATABASE_URL)
    if parsed.scheme.startswith("postgres"):
        db_type = "postgresql"
    elif parsed.scheme.startswith("mysql"):
        db_type = "mysql"
    else:
        raise ValueError(f"Unsupported database type: {parsed.scheme}")
    
    # Create expenses table (database-specific syntax)
    if db_type == "postgresql":
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS expenses (
                id SERIAL PRIMARY KEY,
                date DATE NOT NULL,
                category VARCHAR(100) NOT NULL,
                amount DECIMAL(10, 2) NOT NULL,
                description TEXT
            )
        """)
    elif db_type == "mysql":
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS expenses (
                id INT AUTO_INCREMENT PRIMARY KEY,
                date DATE NOT NULL,
                category VARCHAR(100) NOT NULL,
                amount DECIMAL(10, 2) NOT NULL,
                description TEXT
            )
        """)
    
    # Clear existing data
    cursor.execute("DELETE FROM expenses")
    
    # Seed sample data
    categories = ["Food", "Transport", "Entertainment", "Shopping", "Bills", "Healthcare", "Travel"]
    descriptions = [
        "Restaurant dinner", "Grocery shopping", "Uber ride", "Movie tickets",
        "Clothing purchase", "Electricity bill", "Doctor visit", "Flight ticket",
        "Coffee", "Gas", "Netflix subscription", "Phone bill", "Gym membership"
    ]
    
    # Generate expenses for the last 90 days
    base_date = datetime.now()
    expenses = []
    
    for i in range(100):  # Generate 100 sample expenses
        days_ago = random.randint(0, 90)
        date = (base_date - timedelta(days=days_ago)).strftime("%Y-%m-%d")
        category = random.choice(categories)
        amount = round(random.uniform(5.0, 500.0), 2)
        description = random.choice(descriptions)
        
        expenses.append((date, category, amount, description))
    
    # Insert data using the correct parameter style
    insert_sql = f"INSERT INTO expenses (date, category, amount, description) VALUES ({param_style}, {param_style}, {param_style}, {param_style})"
    cursor.executemany(insert_sql, expenses)
    
    conn.commit()
    conn.close()
    print(f"Database ({db_type}) initialized with {len(expenses)} expenses")

if __name__ == "__main__":
    init_database()

