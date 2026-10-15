@echo off
REM ===========================================================================
REM  VyGo face verification service (self-hosted, free, CPU).
REM  Creates a local virtual environment on first run, installs dependencies,
REM  then starts the API on http://localhost:8100.
REM ===========================================================================
setlocal
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
  echo [face-service] creating virtual environment...
  python -m venv .venv || goto :error
  echo [face-service] installing dependencies ^(first run downloads ~1 GB: TensorFlow^)...
  ".venv\Scripts\python.exe" -m pip install --upgrade pip || goto :error
  ".venv\Scripts\python.exe" -m pip install -r requirements.txt || goto :error
)

echo [face-service] starting on http://localhost:8100 ...
".venv\Scripts\python.exe" app.py
goto :eof

:error
echo [face-service] setup failed. Ensure Python 3.10+ is installed and on PATH.
exit /b 1
