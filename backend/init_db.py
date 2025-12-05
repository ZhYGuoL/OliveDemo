"""Initialize the SQLite database with schema and sample data."""
import sqlite3
import os
from datetime import datetime, timedelta
import random

# Database path relative to backend directory
_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(_BACKEND_DIR, "olive_demo.db")

def init_database():
    """Create database schema and seed with sample data."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create expenses table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            category TEXT NOT NULL,
            amount REAL NOT NULL,
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
    
    cursor.executemany(
        "INSERT INTO expenses (date, category, amount, description) VALUES (?, ?, ?, ?)",
        expenses
    )
    
    conn.commit()
    conn.close()
    print(f"Database initialized with {len(expenses)} expenses")

if __name__ == "__main__":
    init_database()

