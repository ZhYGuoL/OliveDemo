# PostgreSQL Setup Scripts

This directory contains scripts to set up a PostgreSQL database for testing.

## Quick Start

### 1. Install Python dependencies

```bash
pip install -r scripts/requirements.txt
```

### 2. Start PostgreSQL

```bash
./scripts/setup_postgres.sh
```

Or manually:
```bash
docker-compose up -d
```

### 3. Connect Your Database

Use the connection string below in the app's connection form to connect your PostgreSQL database.

## Connection String

Once set up, use this connection string in your app:

```
postgresql://postgres:postgres@localhost:5433/ecommerce
```

**Note:** Port 5433 is used instead of 5432 to avoid conflicts with any existing PostgreSQL installations.

## Testing the Connection

You can test the connection using the app's connection form, or via Python:

```python
import psycopg2

conn = psycopg2.connect("postgresql://postgres:postgres@localhost:5433/ecommerce")
cursor = conn.cursor()
cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';")
print(cursor.fetchall())
conn.close()
```

## Stopping PostgreSQL

```bash
docker-compose down
```

To remove all data:
```bash
docker-compose down -v
```

