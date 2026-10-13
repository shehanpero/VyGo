@echo off
REM Refresh the Cloudflare D1 cloud copy from the live H2 database.
REM Used by the "VyGo D1 Sync" scheduled task (and can be run manually).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0sync-d1.ps1"
