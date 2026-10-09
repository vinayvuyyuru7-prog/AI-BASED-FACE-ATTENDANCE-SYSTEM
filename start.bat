@echo off
title FaceAttend AI - Startup
color 0A
echo.
echo  ========================================
echo   FaceAttend AI - Starting System...
echo  ========================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found! Please install Python 3.9+
    pause & exit
)

REM Check Node
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found! Please install Node.js
    pause & exit
)

echo [1/3] Installing Python backend dependencies...
cd /d "%~dp0backend"
pip install -r requirements.txt --quiet

echo.
echo [2/3] Starting FastAPI backend on http://localhost:8000
start "FaceAttend - Backend" cmd /k "cd /d "%~dp0backend" && python main.py"

timeout /t 3 /nobreak >nul

echo.
echo [3/3] Starting React frontend on http://localhost:5173
start "FaceAttend - Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

timeout /t 4 /nobreak >nul

echo.
echo  ========================================
echo   READY!
echo   Frontend : http://localhost:5173
echo   Backend  : http://localhost:8000
echo   API Docs : http://localhost:8000/docs
echo  ========================================
echo.

start http://localhost:5173
pause
