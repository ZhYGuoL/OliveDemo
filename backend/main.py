"""FastAPI backend server."""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import database
import llm_service

app = FastAPI(title="Personal Olive API")

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Vite default port
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

@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok"}

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
            llm_result = llm_service.generate_dashboard(request.prompt, db_schema_ddl)
        except ValueError as e:
            raise HTTPException(
                status_code=500,
                detail=f"Model returned invalid JSON. Please try again or simplify the request. Error: {str(e)}"
            )
        except Exception as e:
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

