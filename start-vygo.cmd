@echo off
REM Double-click this to start VyGo's backend + self-healing public tunnel.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-vygo.ps1"
echo.
pause
