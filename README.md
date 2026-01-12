# OliveDemo - AI-Powered Dashboard Generator

Generate interactive dashboards from natural language using AI. Connect to your database, describe what you want to see, and get instant visualizations.

## Features

- 🤖 **AI-Powered**: Uses Google Gemini to understand natural language queries
- 📊 **Instant Dashboards**: Generate KPIs, charts, and tables automatically
- 🗄️ **Multi-Database**: Supports PostgreSQL, MySQL, Supabase, and SQLite
- 🎨 **Interactive UI**: Modern React interface with real-time previews
- 🔒 **Secure**: Read-only queries, SQL injection protection

## Architecture

- **Backend**: Python + FastAPI + Google Gemini API
- **Frontend**: React + TypeScript + Vite
- **Database**: SQLite (default), PostgreSQL, MySQL, or Supabase
- **Deployment**: GitHub Pages (frontend) + Render/Railway (backend)

## Quick Start

### 1. Prerequisites

- Python 3.8+
- Node.js 18+
- [Google AI Studio API Key](https://aistudio.google.com/app/apikey) (free)

### 2. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
GOOGLE_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-1.5-flash
EOF

# Initialize demo database (optional)
python init_db.py

# Start server
uvicorn main:app --reload
```

Backend runs at `http://localhost:8000`

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`

### 4. Connect Your Database

The app supports multiple databases:

**SQLite** (default - demo data):
- No configuration needed
- Perfect for testing

**PostgreSQL / Supabase**:
```bash
# In backend/.env
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

**MySQL**:
```bash
# In backend/.env
DATABASE_URL=mysql://user:password@host:3306/dbname
```

## Usage

1. Open `http://localhost:5173`
2. Connect to a database (or use default SQLite demo)
3. Type a natural language query:
   - "Show total revenue by month"
   - "Top 10 customers by orders"
   - "Product category breakdown as a pie chart"
4. View your generated dashboard!

## Deployment

### Option 1: Quick Deploy (GitHub Pages + Render)

**Deploy Backend** (5 minutes):
1. Go to [render.com](https://render.com) and sign in
2. New Web Service → Connect your repo
3. Set environment variables:
   ```
   GOOGLE_API_KEY=your_key
   CORS_ORIGINS=https://yourusername.github.io
   ```
4. Copy your backend URL (e.g., `https://yourapp.onrender.com`)

**Deploy Frontend** (automatic):
1. Create `frontend/.env.production`:
   ```
   VITE_API_URL=https://yourapp.onrender.com
   ```
2. Commit and push to `main` branch
3. GitHub Actions automatically deploys to Pages
4. Visit `https://yourusername.github.io/OliveDemo/`

### Option 2: Railway (Alternative Backend)

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

Set environment variables in Railway dashboard.

### Environment Variables

**Backend** (`backend/.env`):
```bash
GOOGLE_API_KEY=your_api_key          # Required
GEMINI_MODEL=gemini-1.5-flash        # Optional
DATABASE_URL=postgresql://...        # Optional (defaults to SQLite)
CORS_ORIGINS=https://your-site.com   # Optional (for production)
```

**Frontend** (`frontend/.env.production`):
```bash
VITE_API_URL=https://your-backend-url.onrender.com
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/connect` | POST | Connect to database |
| `/disconnect` | POST | Disconnect from database |
| `/schema` | GET | Get database schema |
| `/generate_dashboard` | POST | Generate dashboard from prompt |
| `/suggestions` | GET | Get AI-generated dashboard ideas |

## Project Structure

```
OliveDemo/
├── backend/
│   ├── main.py                  # FastAPI server
│   ├── llm_service.py          # Google Gemini integration
│   ├── database.py             # Database abstraction layer
│   ├── database_adapters.py    # DB-specific adapters
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx            # Main app component
│   │   ├── components/        # UI components
│   │   └── config.ts          # API configuration
│   ├── package.json
│   └── vite.config.ts
├── .github/workflows/
│   └── deploy.yml             # GitHub Pages deployment
└── render.yaml                 # Render configuration
```

## Troubleshooting

**"Not allowed to request resource" / CORS Error**:
- ✅ **Local dev**: Frontend at `localhost:5173` → Backend at `localhost:8000` works automatically
- ❌ **Deployed GitHub Pages** → `localhost:8000` won't work (different origins)
- ✅ **Solution**: Deploy backend to Render and set `VITE_API_URL` in production

**Backend errors**:
- Check `GOOGLE_API_KEY` is set correctly
- Verify API key at [Google AI Studio](https://aistudio.google.com/app/apikey)
- Check backend logs: `uvicorn main:app --reload`

**Database connection fails**:
- Verify `DATABASE_URL` format is correct
- Check database credentials and network access
- For SQLite: Ensure `init_db.py` ran successfully

**Build fails on GitHub Actions**:
- Check Actions tab for error details
- Ensure `package-lock.json` is committed
- Verify environment variables are set

## Security

- ✅ Read-only queries (SELECT only)
- ✅ SQL injection protection
- ✅ Query validation before execution
- ✅ Results limited to 100 rows
- ✅ CORS protection

## Tech Stack

**Backend**:
- FastAPI - Web framework
- Google Gemini API - LLM for dashboard generation
- Psycopg2 / PyMySQL - Database drivers
- Python-dotenv - Environment management

**Frontend**:
- React 18 - UI framework
- TypeScript - Type safety
- Vite - Build tool
- Recharts - Chart visualization
- TipTap - Rich text editor

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR.
