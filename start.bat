@echo off
echo Starting NarrateMe Development Server...
echo.

REM Check if backend venv exists, create if not
if not exist "backend\venv" (
    echo Creating Python virtual environment...
    cd backend
    python -m venv venv
    cd ..
)

REM Activate virtual environment and install backend dependencies
echo Activating virtual environment and installing backend dependencies...
call backend\venv\Scripts\activate
pip install -r backend\requirements.txt

REM Start backend server in new window
echo Starting backend server on http://localhost:8000...
start "NarrateMe Backend" cmd /k "cd backend && venv\Scripts\activate && uvicorn app.main:app --reload --port 8000"

REM Install frontend dependencies
echo Installing frontend dependencies...
cd frontend
call npm install
cd ..

REM Start frontend server in new window
echo Starting frontend server on http://localhost:3000...
start "NarrateMe Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Both servers are starting in separate windows:
echo - Backend: http://localhost:8000
echo - Frontend: http://localhost:3000
echo.
echo Press any key to close this window (servers will continue running)...
pause >nul
