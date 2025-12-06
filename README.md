# Dashboard Generator

A local dashboard generator that converts natural language prompts into SQL queries and React components.

## Architecture

- **Backend**: Python + FastAPI
- **Frontend**: React + TypeScript  
- **Database**: SQLite (default), PostgreSQL, Supabase, or MySQL
- **LLM**: Ollama (local)

## Prerequisites

1. **Python 3.8+** installed
2. **Node.js 18+** and npm installed
3. **Ollama** installed and running locally

## Setup

### 1. Install and Start Ollama

Download and install Ollama from [https://ollama.ai](https://ollama.ai)

Start Ollama:
```bash
ollama serve
```

Pull a model (recommended: llama3.2 or llama3.1):
```bash
ollama pull llama3.2
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python init_db.py  # Initialize database with sample data
```

**Database Configuration:**

The application supports multiple database backends through a flexible adapter system:

**SQLite (Default - No configuration needed):**
```bash
# Just run init_db.py - no setup required
python init_db.py
```

**PostgreSQL / Supabase:**
```bash
# PostgreSQL connection string format:
export DATABASE_URL=postgresql://username:password@localhost:5432/dbname

# Supabase connection string format:
export DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# Then initialize the database:
python init_db.py
```

**MySQL:**
```bash
# MySQL connection string format:
export DATABASE_URL=mysql://username:password@localhost:3306/dbname

# Then initialize the database:
python init_db.py
```

You can also create a `.env` file in the `backend/` directory:
```
# For PostgreSQL/Supabase
DATABASE_URL=postgresql://username:password@localhost:5432/dbname

# For MySQL
DATABASE_URL=mysql://username:password@localhost:3306/dbname

# Optional: Override SQLite database path (only used if DATABASE_URL is not set)
DB_PATH=./demo.db
```

**Note:** SQLite is the default and requires no configuration. It's perfect for local development and demos. For production or multi-user scenarios, use PostgreSQL, Supabase, or MySQL.

Start the backend server:
```bash
uvicorn main:app --reload
```

The backend will run on `http://localhost:8000`

### 3. Frontend Setup

In a new terminal:
```bash
cd frontend
npm install
npm run dev
```

The frontend will run on `http://localhost:5173`

## Usage

1. Ensure Ollama is running (`ollama serve`)
2. Start the backend server (from `backend/` directory)
3. Start the frontend dev server (from `frontend/` directory)
4. Open `http://localhost:5173` in your browser
5. Enter a prompt like:
   - "Show my top 10 expense categories in the last 3 months"
   - "Build a dashboard of my monthly expenses by category"
   - "Display total spending per category as a bar chart"
6. View the generated SQL, data preview, and React component code

## Project Structure

```
DashboardDemo/
├── backend/
│   ├── main.py              # FastAPI server
│   ├── database.py          # Database layer (schema introspection, SQL execution)
│   ├── llm_service.py       # Ollama LLM integration
│   ├── init_db.py           # Database initialization script
│   ├── requirements.txt     # Python dependencies
│   └── demo.db        # SQLite database (created after init_db.py)
├── frontend/
│   ├── src/
│   │   ├── App.tsx          # Main React component
│   │   ├── App.css          # Styles
│   │   ├── main.tsx         # Entry point
│   │   └── index.css        # Global styles
│   ├── package.json         # Node dependencies
│   └── vite.config.ts       # Vite configuration
└── README.md
```

## API Endpoints

### `GET /health`
Health check endpoint.

**Response:**
```json
{ "status": "ok" }
```

### `POST /generate_dashboard`
Generate SQL query and React component from natural language prompt.

**Request:**
```json
{
  "prompt": "Show my top 10 expense categories"
}
```

**Response:**
```json
{
  "sql": "SELECT category, SUM(amount) as total FROM expenses GROUP BY category ORDER BY total DESC LIMIT 10",
  "reactComponent": "export function Dashboard({ data }: { data: any[] }) { ... }",
  "dataPreview": [
    { "category": "Food", "total": 1234.56 },
    ...
  ]
}
```

## Security Features

- Only SELECT queries are allowed (no INSERT, UPDATE, DELETE, DROP, etc.)
- SQL injection protection via parameterized queries
- Query validation before execution
- Results limited to 100 rows by default

## Troubleshooting

**Backend can't connect to Ollama:**
- Ensure Ollama is running: `ollama serve`
- Check that the model is pulled: `ollama list`
- Verify Ollama is accessible at `http://localhost:11434`

**Database errors:**
- Run `python backend/init_db.py` to recreate the database
- Check file permissions in the `backend/` directory
- For PostgreSQL/Supabase: Ensure the database exists and credentials are correct
- For PostgreSQL/Supabase: Verify `psycopg2-binary` is installed: `pip install psycopg2-binary`
- For MySQL: Ensure the database exists and credentials are correct
- For MySQL: Verify `pymysql` is installed: `pip install pymysql`
- Verify your `DATABASE_URL` format matches the expected connection string format

**Frontend can't reach backend:**
- Verify backend is running on port 8000
- Check CORS settings in `backend/main.py`
- Ensure no firewall is blocking localhost connections

