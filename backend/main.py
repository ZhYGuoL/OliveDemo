"""FastAPI backend server."""
import logging
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
import database
import llm_service

# Load environment variables from .env file
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Dashboard Generator API")

# CORS middleware for frontend
# Get allowed origins from environment variable or use defaults
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
    sql: str
    reactComponent: str
    dataPreview: List[Dict[str, Any]]

class ConnectRequest(BaseModel):
    database_url: str

@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok"}

@app.post("/connect")
async def connect_database(request: ConnectRequest):
    """
    Connect to a database by setting the DATABASE_URL.
    """
    logger.info(f"Connection request received for: {request.database_url.split('@')[1] if '@' in request.database_url else 'database'}")
    
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
                adapter = get_database_adapter(database_url=request.database_url, db_path=None)
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
            logger.error(f"Connection timeout for: {request.database_url.split('@')[1] if '@' in request.database_url else request.database_url}")
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
        
        # Set the environment variable (in-memory for this session)
        os.environ["DATABASE_URL"] = request.database_url
        
        # Reset the database adapter singleton to use the new connection
        import database
        database._adapter = None
        database._current_database_url = None
        
        logger.info(f"Database connected successfully: {request.database_url.split('@')[1] if '@' in request.database_url else 'connected'}")
        return {"status": "connected", "message": "Database connected successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Database connection error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=400,
            detail=f"Failed to connect to database: {str(e)}"
        )

@app.get("/schema")
async def get_schema():
    """
    Get database schema to verify connection.
    """
    try:
        schema = database.get_schema_ddl()
        return {"schema": schema, "connected": True}
    except Exception as e:
        logger.error(f"Schema retrieval error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve schema: {str(e)}"
        )

@app.post("/generate_dashboard", response_model=GenerateDashboardResponse)
async def generate_dashboard(request: GenerateDashboardRequest):
    """
    Generate SQL query and React component from natural language prompt.
    """
    try:
        # Get database schema
        db_schema_ddl = database.get_schema_ddl()
        
        # Generate SQL and React component via LLM
        try:
            logger.info(f"Generating dashboard for prompt: {request.prompt[:100]}")
            llm_result = llm_service.generate_dashboard(request.prompt, db_schema_ddl)
            logger.info("Successfully generated dashboard")
        except ValueError as e:
            logger.error(f"JSON parsing error: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Model returned invalid JSON. Please try again or simplify the request. Error: {str(e)}"
            )
        except Exception as e:
            logger.error(f"LLM service error: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail=f"LLM service error: {str(e)}"
            )
        
        sql_query = llm_result["sql"]
        react_component = llm_result["reactComponent"]
        
        # Execute SQL query
        try:
            data_preview = database.execute_select_query(sql_query, limit=100)
        except ValueError as e:
            raise HTTPException(
                status_code=400,
                detail=f"SQL failed: {str(e)}. Generated SQL: {sql_query}"
            )
        
        return GenerateDashboardResponse(
            sql=sql_query,
            reactComponent=react_component,
            dataPreview=data_preview
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

