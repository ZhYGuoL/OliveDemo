# OliveDemo - AI-Powered Dashboard Generator

Generate interactive dashboards from natural language using AI. Connect to your database, describe what you want to see, and get instant visualizations.

## Features

- 🤖 **AI-Powered**: Uses Google Gemini to understand natural language queries
- 📊 **Instant Dashboards**: Generate KPIs, charts, and tables automatically
- 🗄️ **Multi-Database**: Supports PostgreSQL, MySQL, Supabase, and SQLite
- 🎨 **Interactive UI**: Modern React interface with real-time previews
- 🔐 **User Authentication**: Secure login/signup with email and Google OAuth
- 💾 **Data Persistence**: Save database connections and chat history
- 🔒 **Secure**: Read-only queries, SQL injection protection, rate limiting

## Architecture

- **Backend**: Python + FastAPI + Google Gemini API
- **Frontend**: React + TypeScript + Vite
- **Authentication**: Supabase Auth (email/password)
- **Data Storage**: Supabase (user connections, chat history)
- **Database**: SQLite (default), PostgreSQL, MySQL, or Supabase
- **Deployment**: GitHub Pages (frontend) + Render/Railway (backend)

## Quick Start

### 1. Prerequisites

- Python 3.8+
- Node.js 18+
- [Google AI Studio API Key](https://aistudio.google.com/app/apikey) (free)
- [Supabase Account](https://supabase.com) (free) - for authentication and data storage

### 2. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env and add:
# - GOOGLE_API_KEY (from Google AI Studio)
# - SUPABASE_URL (from Supabase project settings)
# - SUPABASE_ANON_KEY (from Supabase project settings)

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

### 4. Setup Supabase

**Quick setup** (5 minutes):

1. Create a [Supabase project](https://supabase.com)
2. Run the SQL schema: Copy contents of `supabase_schema.sql` and run in SQL Editor
3. Get your API keys: Settings → API (copy Project URL and anon key)
4. Add to `backend/.env` and `frontend/.env`:
   ```bash
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   ```

See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for detailed step-by-step instructions.

### 5. Connect Your Database

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
2. Login with:
   - **Email/Password**: Sign up and verify email, or
   - **Google OAuth**: Click "Continue with Google" for instant access
3. Connect to a database (or use default SQLite demo)
4. Type a natural language query:
   - "Show total revenue by month"
   - "Top 10 customers by orders"
   - "Product category breakdown as a pie chart"
5. View your generated dashboard!

Your database connections and chat history are automatically saved to your account.

## Deployment

### Option 1: Quick Deploy (GitHub Pages + Render)

**Deploy Backend** (5 minutes):
1. Go to [render.com](https://render.com) and sign in
2. New Web Service → Connect your repo
3. Set environment variables:
   ```
   GOOGLE_API_KEY=your_key
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   CORS_ORIGINS=https://yourusername.github.io
   ```
4. Copy your backend URL (e.g., `https://yourapp.onrender.com`)

**Deploy Frontend** (automatic):
1. Create `frontend/.env.production`:
   ```
   VITE_API_URL=https://yourapp.onrender.com
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
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
GOOGLE_API_KEY=your_api_key               # Required
SUPABASE_URL=https://xxx.supabase.co      # Required
SUPABASE_ANON_KEY=your_anon_key           # Required
GEMINI_MODEL=gemini-1.5-flash             # Optional
DATABASE_URL=postgresql://...             # Optional (defaults to SQLite)
CORS_ORIGINS=https://your-site.com        # Optional (for production)
```

**Frontend** (`frontend/.env` and `frontend/.env.production`):
```bash
VITE_API_URL=http://localhost:8000        # Backend URL
VITE_SUPABASE_URL=https://xxx.supabase.co # Supabase project URL
VITE_SUPABASE_ANON_KEY=your_anon_key      # Supabase anon key
```

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | No | Health check |
| `/connect` | POST | Yes | Connect to database |
| `/disconnect` | POST | Yes | Disconnect from database |
| `/schema` | GET | Yes | Get database schema |
| `/generate_dashboard` | POST | Yes | Generate dashboard from prompt |
| `/suggestions` | GET | Yes | Get AI-generated dashboard ideas |
| `/user/connections` | GET | Yes | Get user's saved connections |
| `/user/connections` | POST | Yes | Save a database connection |
| `/user/connections/{id}` | DELETE | Yes | Delete a saved connection |
| `/user/chats` | GET | Yes | Get user's chat history |
| `/user/chats` | POST | Yes | Save a chat session |
| `/user/chats/{id}` | DELETE | Yes | Delete a chat session |

All authenticated endpoints require a valid Supabase JWT token in the Authorization header.

## Project Structure

```
OliveDemo/
├── backend/
│   ├── main.py                  # FastAPI server
│   ├── llm_service.py          # Google Gemini integration
│   ├── auth.py                 # Supabase authentication
│   ├── supabase_client.py      # Supabase client setup
│   ├── database.py             # Database abstraction layer
│   ├── database_adapters.py    # DB-specific adapters
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx            # Main app component
│   │   ├── supabaseClient.ts  # Supabase client setup
│   │   ├── components/
│   │   │   ├── Login.tsx      # Auth component
│   │   │   └── ...            # Other UI components
│   │   └── config.ts          # API configuration
│   ├── package.json
│   └── vite.config.ts
├── .github/workflows/
│   └── deploy.yml             # GitHub Pages deployment
├── supabase_schema.sql        # Database schema for Supabase
├── SUPABASE_SETUP.md          # Detailed Supabase setup guide
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

- ✅ **User Authentication**: Supabase email/password and Google OAuth with JWT tokens
- ✅ **Rate Limiting**: All endpoints are rate-limited to prevent abuse
- ✅ **Row Level Security**: Users can only access their own data
- ✅ **Read-only queries**: SELECT only (no INSERT, UPDATE, DELETE)
- ✅ **SQL injection protection**: Parameterized queries
- ✅ **Query validation**: Before execution
- ✅ **Results limited**: 100 rows max per query
- ✅ **CORS protection**: Configured allowed origins

## Tech Stack

**Backend**:
- FastAPI - Web framework
- Google Gemini API - LLM for dashboard generation
- Supabase - Authentication and data storage
- SlowAPI - Rate limiting
- Psycopg2 / PyMySQL - Database drivers
- Python-dotenv - Environment management

**Frontend**:
- React 18 - UI framework
- TypeScript - Type safety
- Vite - Build tool
- Supabase JS - Authentication client
- Recharts - Chart visualization
- TipTap - Rich text editor

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR.
