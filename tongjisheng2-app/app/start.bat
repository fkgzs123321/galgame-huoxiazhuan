@echo off
setlocal
title Tongjisheng2 Dev Server
cd /d "%~dp0"
echo Starting Tongjisheng2 dev server at http://localhost:5173/
call npm.cmd run dev -- --host
echo.
echo Dev server exited.
pause
