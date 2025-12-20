#!/usr/bin/env python3
"""Test script to verify SQL queries return data"""

import sys
sys.path.insert(0, '/Users/zhiyuanguo/Desktop/Coding/OliveDemo/backend')

import database

def test_queries():
    print("Testing database connection...")
    try:
        db_type = database.get_database_type()
        db_name = database.get_database_name()
        print(f"Database type: {db_type}")
        print(f"Database name: {db_name}")
    except Exception as e:
        print(f"Error getting database info: {e}")

    # Test query 1
    sql1 = 'SELECT "date", SUM("amount") AS amount, "category" FROM "synthetic_ecommerce_data" GROUP BY "date", "category"'
    print(f"\n=== Testing Query 1 ===")
    print(f"SQL: {sql1}")

    try:
        result1 = database.execute_select_query(sql1, limit=5)
        print(f"Result count: {len(result1)}")
        if result1:
            print(f"First row: {result1[0]}")
            print(f"All rows: {result1}")
        else:
            print("No data returned!")
    except Exception as e:
        print(f"Error: {e}")

    # Test query 2
    sql2 = 'SELECT "Conversion_Rate" FROM "synthetic_ecommerce_data"'
    print(f"\n=== Testing Query 2 ===")
    print(f"SQL: {sql2}")

    try:
        result2 = database.execute_select_query(sql2, limit=5)
        print(f"Result count: {len(result2)}")
        if result2:
            print(f"First row: {result2[0]}")
            print(f"All rows: {result2}")
        else:
            print("No data returned!")
    except Exception as e:
        print(f"Error: {e}")

    # Test simple query to see table structure
    sql3 = 'SELECT * FROM "synthetic_ecommerce_data" LIMIT 3'
    print(f"\n=== Testing Simple Query ===")
    print(f"SQL: {sql3}")

    try:
        result3 = database.execute_select_query(sql3, limit=3)
        print(f"Result count: {len(result3)}")
        if result3:
            print(f"Columns: {list(result3[0].keys())}")
            for i, row in enumerate(result3):
                print(f"Row {i}: {row}")
        else:
            print("No data returned!")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_queries()
