@echo off
echo ============================================
echo   ExamGuard Pro - Starting Backend
echo ============================================
echo.
cd /d "%~dp0backend"

:: Check if venv exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Installing dependencies...
pip install -r requirements.txt --quiet

echo.
echo Starting FastAPI server on http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo.
uvicorn main:app --reload --port 8000 --host 0.0.0.0
