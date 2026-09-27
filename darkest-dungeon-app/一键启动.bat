@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
    echo [ERROR] npm not found. Please install Node.js first.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo [INFO] node_modules not found. Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Dependency installation failed.
        pause
        exit /b 1
    )
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "if (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue) { exit 1 } else { exit 0 }"
if errorlevel 1 (
    echo [INFO] Server is already running. Opening browser...
    if "%DD_NO_BROWSER%"=="" start "" "http://localhost:3000/"
    ping -n 3 127.0.0.1 >nul
    exit /b 0
)

echo [INFO] Starting Darkest Dungeon dev server...
start "DD Dev Server" cmd /k "npm run dev -- --port 3000 --strictPort"
ping -n 4 127.0.0.1 >nul
if "%DD_NO_BROWSER%"=="" start "" "http://localhost:3000/"
echo [INFO] Running at http://localhost:3000/
endlocal
