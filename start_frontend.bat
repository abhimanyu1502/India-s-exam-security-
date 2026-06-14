@echo off
echo ============================================
echo   ExamGuard Pro - Starting Frontend
echo ============================================
echo.
cd /d "%~dp0frontend"

:: Install npm deps if needed
if not exist "node_modules" (
    echo Installing npm packages...
    npm install
)

echo.
echo Starting React dev server on http://localhost:5173
echo.
npm run dev
