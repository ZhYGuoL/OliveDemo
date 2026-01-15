"""FastAPI backend server."""
import logging
import os
from datetime import timedelta
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import database
import llm_service
import auth

# Load environment variables from .env file
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="Dashboard Generator API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware for frontend
allowed_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://localhost:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GenerateDashboardRequest(BaseModel):
    prompt: str

class GenerateDashboardResponse(BaseModel):
    spec: Dict[str, Any]
    data: Dict[str, List[Dict[str, Any]]]

class ConnectRequest(BaseModel):
    database_url: str

@app.get("/health")
@limiter.limit("60/minute")
async def health(request: Request):
    """Health check endpoint."""
    return {"status": "ok"}

@app.get("/user/connections")
@limiter.limit("30/minute")
async def get_user_connections(request: Request, current_user: dict = Depends(auth.get_current_user)):
    """Get all saved database connections for the current user."""
    from supabase_client import get_supabase_client
    supabase = get_supabase_client()

    response = supabase.table("saved_connections").select("*").eq("user_id", current_user["id"]).execute()
    return {"connections": response.data}

@app.post("/user/connections")
@limiter.limit("10/minute")
async def save_user_connection(request: Request, connection: dict, current_user: dict = Depends(auth.get_current_user)):
    """Save a database connection for the current user."""
    from supabase_client import get_supabase_client
    supabase = get_supabase_client()

    data = {
        "user_id": current_user["id"],
        "name": connection.get("name"),
        "database_type": connection.get("database_type"),
        "database_url": connection.get("database_url")
    }

    response = supabase.table("saved_connections").insert(data).execute()
    return {"connection": response.data[0] if response.data else None}

@app.delete("/user/connections/{connection_id}")
@limiter.limit("10/minute")
async def delete_user_connection(request: Request, connection_id: str, current_user: dict = Depends(auth.get_current_user)):
    """Delete a saved database connection."""
    from supabase_client import get_supabase_client
    supabase = get_supabase_client()

    response = supabase.table("saved_connections").delete().eq("id", connection_id).eq("user_id", current_user["id"]).execute()
    return {"success": True}

@app.get("/user/chats")
@limiter.limit("30/minute")
async def get_user_chats(request: Request, current_user: dict = Depends(auth.get_current_user)):
    """Get all chat sessions for the current user."""
    from supabase_client import get_supabase_client
    supabase = get_supabase_client()

    response = supabase.table("chat_sessions").select("*").eq("user_id", current_user["id"]).order("updated_at", desc=True).limit(50).execute()
    return {"chats": response.data}

@app.post("/user/chats")
@limiter.limit("20/minute")
async def save_user_chat(request: Request, chat: dict, current_user: dict = Depends(auth.get_current_user)):
    """Save or update a chat session."""
    from supabase_client import get_supabase_client
    supabase = get_supabase_client()

    chat_id = chat.get("id")
    data = {
        "user_id": current_user["id"],
        "title": chat.get("title", "New Chat"),
        "messages": chat.get("messages", []),
        "dashboards": chat.get("dashboards", [])
    }

    if chat_id:
        # Update existing chat
        response = supabase.table("chat_sessions").update(data).eq("id", chat_id).eq("user_id", current_user["id"]).execute()
    else:
        # Create new chat
        response = supabase.table("chat_sessions").insert(data).execute()

    return {"chat": response.data[0] if response.data else None}

@app.delete("/user/chats/{chat_id}")
@limiter.limit("10/minute")
async def delete_user_chat(request: Request, chat_id: str, current_user: dict = Depends(auth.get_current_user)):
    """Delete a chat session."""
    from supabase_client import get_supabase_client
    supabase = get_supabase_client()

    response = supabase.table("chat_sessions").delete().eq("id", chat_id).eq("user_id", current_user["id"]).execute()
    return {"success": True}

@app.post("/connect")
@limiter.limit("10/minute")
async def connect_database(request: Request, connect_request: ConnectRequest, current_user: str = Depends(auth.get_current_user)):
    """Connect to a database by setting the DATABASE_URL."""
    logger.info(f"Connection request received for: {connect_request.database_url.split('@')[1] if '@' in connect_request.database_url else 'database'}")
    
    try:
        # Validate the connection string by trying to create an adapter
        from database_adapters import get_database_adapter
        import asyncio
        import concurrent.futures
        
        # Test connection synchronously in a thread pool
        def test_connection_sync():
            """Synchronous connection test function."""
            logger.info("Starting connection test...")
            try:
                adapter = get_database_adapter(database_url=connect_request.database_url, db_path=None)
                logger.info("Adapter created, attempting connection...")
                conn = adapter.connect()  # This already has connect_timeout=5
                logger.info("Connection established, testing query...")
                try:
                    cursor = conn.cursor()
                    cursor.execute("SELECT 1")
                    cursor.fetchone()
                    cursor.close()
                    logger.info("Connection test successful")
                finally:
                    conn.close()
            except Exception as e:
                logger.error(f"Error in connection test: {str(e)}")
                raise
        
        # Run connection test in thread pool with timeout
        logger.info("Running connection test in thread pool...")
        loop = asyncio.get_running_loop()
        
        try:
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                logger.info("Executor created, submitting task...")
                future = loop.run_in_executor(executor, test_connection_sync)
                logger.info("Task submitted, waiting for result with 15s timeout...")
                await asyncio.wait_for(future, timeout=15.0)
            logger.info("Connection test passed")
        except asyncio.TimeoutError:
            logger.error(f"Connection timeout for: {connect_request.database_url.split('@')[1] if '@' in connect_request.database_url else connect_request.database_url}")
            raise HTTPException(
                status_code=400,
                detail="Connection timeout. Please check your database is running and accessible."
            )
        except Exception as conn_error:
            logger.error(f"Connection test failed: {str(conn_error)}", exc_info=True)
            raise HTTPException(
                status_code=400,
                detail=f"Failed to connect to database: {str(conn_error)}"
            )
        
        # Set the database connection for this user ONLY
        user_id = current_user["id"]
        database.set_user_database(user_id, connect_request.database_url)

        logger.info(f"User {user_id} connected to database")

        # Return connection info
        return {
            "status": "connected",
            "message": "Database connected successfully",
            "database_type": database.get_user_database_type(user_id),
            "database_name": database.get_user_database_name(user_id)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Database connection error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=400,
            detail=f"Failed to connect to database: {str(e)}"
        )

@app.post("/disconnect")
@limiter.limit("10/minute")
async def disconnect_database(request: Request, current_user: dict = Depends(auth.get_current_user)):
    """Disconnect from the current database."""
    # Clear the connection state for this user only
    user_id = current_user["id"]
    database.clear_user_database(user_id)
    logger.info(f"User {user_id} disconnected from database")
    return {"status": "disconnected"}

@app.get("/schema")
@limiter.limit("30/minute")
async def get_schema(request: Request, current_user: dict = Depends(auth.get_current_user)):
    """Get database schema to verify connection."""
    try:
        user_id = current_user["id"]
        # Check if database is connected for this user
        current_url = database.get_user_database_url(user_id)
        if not current_url:
            return {"schema": "", "connected": False, "database_type": None, "database_name": None, "tables": []}

        schema = database.get_schema_ddl(user_id)
        database_type = database.get_user_database_type(user_id)
        database_name = database.get_user_database_name(user_id)

        # Extract table names from schema
        import re
        table_matches = re.findall(r'CREATE TABLE\s+(?:"?)(\w+)(?:"?)', schema, re.IGNORECASE)
        table_names = [t.lower() for t in table_matches] if table_matches else []

        return {
            "schema": schema,
            "connected": True,
            "database_type": database_type,
            "database_name": database_name,
            "tables": table_names
        }
    except RuntimeError as e:
        # No database connected
        logger.info(f"No database connected: {str(e)}")
        return {"schema": "", "connected": False, "database_type": None, "database_name": None, "tables": []}
    except Exception as e:
        logger.error(f"Schema retrieval error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve schema: {str(e)}"
        )

@app.get("/suggestions")
@limiter.limit("10/minute")
async def get_dashboard_suggestions(request: Request, current_user: dict = Depends(auth.get_current_user)):
    """Get dashboard suggestions based on the connected database schema."""
    try:
        user_id = current_user["id"]
        # Check if database is connected for this user
        current_url = database.get_user_database_url(user_id)
        if not current_url:
            return {"suggestions": []}

        schema = database.get_schema_ddl(user_id)

        # Extract table names from schema
        import re
        table_matches = re.findall(r'CREATE TABLE\s+(?:"?)(\w+)(?:"?)', schema, re.IGNORECASE)
        table_names = [t.lower() for t in table_matches] if table_matches else []

        # Generate fresh suggestions using LLM each time
        # This allows "More ideas" button to generate new suggestions
        logger.info("Generating new suggestions with LLM")
        suggestions = llm_service.generate_dashboard_suggestions(schema, table_names)

        return {"suggestions": suggestions}
    except RuntimeError as e:
        # No database connected
        logger.info(f"No database connected for suggestions: {str(e)}")
        return {"suggestions": []}
    except Exception as e:
        logger.error(f"Failed to generate suggestions: {str(e)}", exc_info=True)
        # Return empty suggestions on error rather than failing
        return {"suggestions": []}

@app.post("/generate_dashboard", response_model=GenerateDashboardResponse)
@limiter.limit("10/minute")
async def generate_dashboard(req: Request, request: GenerateDashboardRequest, current_user: dict = Depends(auth.get_current_user)):
    """
    Generate dashboard spec and fetch data.
    """
    try:
        user_id = current_user["id"]
        # Get database schema for this user
        db_schema_ddl = database.get_schema_ddl(user_id)
        
        # Parse table references from prompt (e.g., @users, @orders)
        from prompt_utils import parse_table_references, filter_schema_by_tables
        referenced_tables = parse_table_references(request.prompt)
        
        # Filter schema to only include referenced tables if any are specified
        if referenced_tables:
            logger.info(f"User referenced tables: {referenced_tables}")
            db_schema_ddl = filter_schema_by_tables(db_schema_ddl, referenced_tables)
            # If filtering resulted in empty schema, warn but continue with full schema
            if not db_schema_ddl.strip() or "CREATE TABLE" not in db_schema_ddl:
                logger.warning(f"Filtered schema is empty for tables {referenced_tables}, using full schema")
                db_schema_ddl = database.get_schema_ddl(user_id)
        
        # Generate Spec via LLM
        try:
            logger.info(f"Generating dashboard for prompt: {request.prompt[:100]}")
            spec = llm_service.generate_dashboard(request.prompt, db_schema_ddl, referenced_tables)
            logger.info("Successfully generated dashboard spec")
        except ValueError as e:
            logger.error(f"JSON parsing error: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Model returned invalid JSON. Error: {str(e)}"
            )
        except Exception as e:
            logger.error(f"LLM service error: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail=f"LLM service error: {str(e)}"
            )
        
        # Execute SQL queries for each data source
        data_results = {}
        data_sources = spec.get("dataSources", [])
        
        for source in data_sources:
            source_id = source.get("id")
            sql_query = source.get("sql")
            
            if source_id and sql_query:
                try:
                    logger.info(f"Executing query for source {source_id}")
                    results = database.execute_select_query(user_id, sql_query, limit=1000)
                    data_results[source_id] = results
                except ValueError as e:
                    logger.warning(f"SQL failed for source {source_id}: {str(e)}")
                    # Return empty list on error but don't fail the whole request
                    data_results[source_id] = []
        
        return GenerateDashboardResponse(
            spec=spec,
            data=data_results
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
