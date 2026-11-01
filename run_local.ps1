# PowerShell one-click runner for MCP Full-Stack Chatbot
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "Starting Antigravity AI Full-Stack MCP Chatbot" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

# 1. MCP Server
Write-Host "[1/3] Starting MCP Tools Server on http://localhost:8001..." -ForegroundColor Yellow
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "& '.\venv\Scripts\python.exe' mcp_server\server.py"

# 2. FastAPI Backend
Write-Host "[2/3] Starting FastAPI Backend on http://localhost:8000..." -ForegroundColor Yellow
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "& '.\venv\Scripts\uvicorn.exe' app.main:app --app-dir backend --host 0.0.0.0 --port 8000 --reload"

# 3. Frontend
Write-Host "[3/3] Starting React Frontend on http://localhost:3000..." -ForegroundColor Yellow
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host ""
Write-Host "All 3 services started in independent terminals!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Green
Write-Host "Backend:  http://localhost:8000/docs" -ForegroundColor Green
Write-Host "MCP Tool: http://localhost:8001/health" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Cyan

