@echo off
echo ===================================================
echo Starting Antigravity AI Full-Stack MCP Chatbot
echo ===================================================

echo [1/3] Starting MCP Server on port 8001...
start "MCP Tools Server (:8001)" cmd /k ".\venv\Scripts\python.exe mcp_server\server.py"

echo [2/3] Starting FastAPI Backend on port 8000...
start "FastAPI Backend (:8000)" cmd /k ".\venv\Scripts\uvicorn.exe app.main:app --app-dir backend --host 0.0.0.0 --port 8000 --reload"

echo [3/3] Starting React Frontend on port 3000...
start "React Frontend (:3000)" cmd /k "cd frontend && npm run dev"

echo.
echo All services launched!
echo - React Frontend: http://localhost:3000
echo - FastAPI Backend: http://localhost:8000
echo - MCP Server:      http://localhost:8001
echo ===================================================

