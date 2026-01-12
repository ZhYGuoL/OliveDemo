# Dashboard Generator

A local dashboard generator that converts natural language prompts into SQL queries and React components.

## Architecture

- **Backend**: Python + FastAPI
- **Frontend**: React + TypeScript
- **Database**: SQLite (default), PostgreSQL, Supabase, or MySQL
- **LLM**: Google AI Studio (Gemini API)

## Prerequisites

1. **Python 3.8+** installed
2. **Node.js 18+** and npm installed
3. **Google AI Studio API Key** - Get one from [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)

## Setup

### 1. Get Google AI Studio API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Copy the API key for use in the backend configuration

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
# Google AI Studio API Key (required)
GOOGLE_API_KEY=your_api_key_here

# Optional: Specify Gemini model (default: gemini-1.5-flash)
GEMINI_MODEL=gemini-1.5-flash

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

1. Ensure you have set your `GOOGLE_API_KEY` in the `.env` file
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
│   ├── llm_service.py       # Google AI Studio (Gemini) integration
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

## Deployment

This application can be deployed with the frontend on GitHub Pages and the backend on a cloud service.

### Deploy Frontend to GitHub Pages

1. **Enable GitHub Pages** in your repository:
   - Go to Settings > Pages
   - Under "Build and deployment", select "GitHub Actions" as the source

2. **Configure environment variables**:
   - Create `frontend/.env.production` with your backend URL:
     ```bash
     VITE_API_URL=https://your-backend-url.onrender.com
     ```

3. **Deploy**:
   - Push to the `main` branch
   - GitHub Actions will automatically build and deploy
   - Your app will be available at: `https://yourusername.github.io/OliveDemo/`

Alternatively, deploy manually:
```bash
cd frontend
npm install gh-pages --save-dev
npm run deploy
```

### Deploy Backend to Render

1. **Create a Render account** at [render.com](https://render.com)

2. **Create a new Web Service**:
   - Connect your GitHub repository
   - Render will detect the `render.yaml` configuration

3. **Set environment variables** in Render dashboard:
   - `GOOGLE_API_KEY`: Your Google AI Studio API key
   - `CORS_ORIGINS`: Add your GitHub Pages URL (e.g., `https://yourusername.github.io`)
   - `DATABASE_URL`: (Optional) Your database connection string

4. **Deploy**: Render will automatically deploy when you push to main

### Alternative Backend Hosting Options

**Railway**:
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

**Vercel** (Serverless):
- Install Vercel CLI: `npm install -g vercel`
- Run `vercel` in the project root
- Configure environment variables in Vercel dashboard

**Heroku**:
```bash
# Create Procfile in backend directory
echo "web: uvicorn main:app --host 0.0.0.0 --port \$PORT" > backend/Procfile

# Deploy
heroku create your-app-name
git push heroku main
```

### Environment Variables Summary

**Backend** (`backend/.env`):
- `GOOGLE_API_KEY`: Required - Your Google AI Studio API key
- `GEMINI_MODEL`: Optional - Defaults to `gemini-1.5-flash`
- `DATABASE_URL`: Optional - Database connection string (defaults to SQLite)
- `CORS_ORIGINS`: Optional - Comma-separated allowed origins for CORS

**Frontend** (`frontend/.env.production`):
- `VITE_API_URL`: Required - Your backend API URL

## Troubleshooting

**LLM/API errors:**
- Verify your `GOOGLE_API_KEY` is set correctly in the `.env` file
- Check that your API key is valid at [Google AI Studio](https://aistudio.google.com/app/apikey)
- Ensure you have API quota available (free tier has rate limits)
- Check the backend logs for specific error messages

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

