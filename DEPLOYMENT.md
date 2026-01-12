# Deployment Guide

This guide explains how to deploy the Dashboard Generator application to production.

## Architecture Overview

- **Frontend**: Static React app hosted on GitHub Pages
- **Backend**: Python FastAPI server hosted on Render (or similar service)
- **Database**: SQLite (default) or cloud database (PostgreSQL/MySQL)
- **LLM**: Google AI Studio (Gemini API)

## Quick Start Deployment

### Step 1: Deploy Backend to Render

1. **Create a Render account** at https://render.com

2. **Create a new Web Service**:
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Render will auto-detect the `render.yaml` configuration

3. **Configure Environment Variables**:
   - Go to your service → Environment
   - Add the following variables:
     ```
     GOOGLE_API_KEY=your_google_ai_studio_api_key
     CORS_ORIGINS=https://zhyguol.github.io
     GEMINI_MODEL=gemini-1.5-flash
     ```

4. **Get your backend URL**:
   - After deployment, copy the URL (e.g., `https://olivedemo-backend.onrender.com`)

### Step 2: Configure Frontend

1. **Create production environment file**:
   ```bash
   cd frontend
   cp .env.example .env.production
   ```

2. **Edit `.env.production`**:
   ```bash
   VITE_API_URL=https://your-backend-url.onrender.com
   ```

### Step 3: Enable GitHub Pages

1. **Go to your GitHub repository**:
   - Settings → Pages
   - Under "Build and deployment", select "GitHub Actions"

2. **Commit and push your changes**:
   ```bash
   git add .
   git commit -m "Configure for GitHub Pages deployment"
   git push origin main
   ```

3. **Wait for deployment**:
   - Check the Actions tab to see deployment progress
   - Your app will be live at: `https://yourusername.github.io/OliveDemo/`

## Environment Variables Reference

### Backend Environment Variables

Create a `.env` file in the `backend/` directory with:

```bash
# Required
GOOGLE_API_KEY=your_api_key_from_google_ai_studio

# Optional - Gemini Model
GEMINI_MODEL=gemini-1.5-flash

# Optional - CORS Origins (add your GitHub Pages URL)
CORS_ORIGINS=https://yourusername.github.io,https://localhost:5173

# Optional - Database (defaults to SQLite)
# For PostgreSQL/Supabase:
# DATABASE_URL=postgresql://user:password@host:5432/dbname

# For MySQL:
# DATABASE_URL=mysql://user:password@host:3306/dbname
```

### Frontend Environment Variables

Create `.env.production` in the `frontend/` directory:

```bash
# Backend API URL (replace with your actual backend URL)
VITE_API_URL=https://your-backend-url.onrender.com
```

## Manual Deployment

### Manual Frontend Deployment

```bash
cd frontend

# Install dependencies
npm install

# Install gh-pages
npm install gh-pages --save-dev

# Deploy
npm run deploy
```

### Manual Backend Deployment (Render CLI)

```bash
# Install Render CLI
npm install -g @render/cli

# Login
render login

# Deploy
render deploy
```

## Alternative Hosting Options

### Railway (Backend)

1. Install Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```

2. Login and initialize:
   ```bash
   railway login
   cd backend
   railway init
   ```

3. Set environment variables:
   ```bash
   railway variables set GOOGLE_API_KEY=your_key
   railway variables set CORS_ORIGINS=https://yourusername.github.io
   ```

4. Deploy:
   ```bash
   railway up
   ```

### Vercel (Backend)

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy:
   ```bash
   cd backend
   vercel
   ```

3. Set environment variables in Vercel dashboard

### Custom Domain

If you want to use a custom domain:

1. **For GitHub Pages**:
   - Add a `CNAME` file in `frontend/public/` with your domain
   - Configure DNS with your domain provider

2. **For Backend**:
   - Add custom domain in Render/Railway dashboard
   - Update `VITE_API_URL` in frontend to use custom domain

## Database Options

### SQLite (Default)

- No configuration needed
- Database file stored on the server
- Best for: Development, small deployments

### PostgreSQL (Recommended for Production)

1. Create a PostgreSQL database (e.g., on Supabase, Railway, or Render)
2. Set `DATABASE_URL` environment variable:
   ```bash
   DATABASE_URL=postgresql://user:password@host:5432/dbname
   ```

### Supabase

1. Create a project at https://supabase.com
2. Get your connection string from Project Settings → Database
3. Set `DATABASE_URL`:
   ```bash
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

## Post-Deployment Checklist

- [ ] Backend is accessible and returns `{"status": "ok"}` at `/health`
- [ ] Frontend loads without errors
- [ ] CORS is configured correctly (frontend can communicate with backend)
- [ ] Google AI Studio API key is set and working
- [ ] Database connection is successful
- [ ] Test dashboard generation functionality

## Monitoring and Maintenance

### Check Backend Logs

**Render**:
- Dashboard → Your Service → Logs

**Railway**:
```bash
railway logs
```

### Update Dependencies

```bash
# Backend
cd backend
pip install -r requirements.txt --upgrade

# Frontend
cd frontend
npm update
```

### Monitor API Usage

- Check Google AI Studio dashboard for API usage and quotas
- Monitor backend performance and response times

## Troubleshooting Deployment

### Frontend shows "Failed to fetch" error

1. Check that `VITE_API_URL` is set correctly
2. Verify CORS_ORIGINS includes your frontend URL
3. Check backend logs for errors

### Backend fails to start

1. Verify all environment variables are set
2. Check that `GOOGLE_API_KEY` is valid
3. Review build logs for dependency errors

### GitHub Actions deployment fails

1. Check Actions tab for error details
2. Verify `vite.config.ts` has correct base path
3. Ensure node_modules is in .gitignore

## Cost Estimates

### Free Tier Limits

- **GitHub Pages**: Free for public repositories
- **Render**: 750 hours/month free (sleeping after inactivity)
- **Google AI Studio**: Generous free tier with rate limits
- **Supabase**: 500MB database free

### Paid Options

- Render: $7/month for always-on service
- Railway: Pay-as-you-go (~$5-10/month for small apps)
- Supabase Pro: $25/month for production features

## Security Best Practices

1. **Never commit `.env` files** - They're in `.gitignore`
2. **Rotate API keys** regularly
3. **Use environment-specific keys** (dev vs production)
4. **Monitor API usage** to detect unusual activity
5. **Enable rate limiting** on backend endpoints
6. **Use HTTPS only** - GitHub Pages and Render provide this by default

## Support

If you encounter issues:
1. Check the logs (backend and GitHub Actions)
2. Review the Troubleshooting section in README.md
3. Open an issue on GitHub with error details
