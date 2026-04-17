@echo off
REM ============================================================
REM  Sentinel AI - start the whole stack locally on WINDOWS
REM  (backend + AI engine + web client, each in its own window)
REM  Requirements: Node.js, Python 3, MongoDB running on 27017
REM ============================================================
cd /d "%~dp0"

echo Checking MongoDB on 127.0.0.1:27017 ...
powershell -NoProfile -Command "if(-not (Test-NetConnection -ComputerName 127.0.0.1 -Port 27017 -WarningAction SilentlyContinue -InformationLevel Quiet)){Write-Host '   WARNING: MongoDB not reachable. Start it first (e.g.  net start MongoDB )'}else{Write-Host '   MongoDB OK'}"

echo Starting Backend (port 5001) ...
start "Sentinel Backend" /d "%~dp0server" cmd /k "if not exist node_modules (npm install) & node server.js"

echo Starting AI engine (port 5002, reads webcam 0) ...
start "Sentinel AI Engine" /d "%~dp0ai-engine" cmd /k "if not exist venv\Scripts\python.exe (python -m venv venv) & call venv\Scripts\activate.bat & pip install -r requirements.txt & python main.py"

echo Starting Web client (port 5173) ...
start "Sentinel Web Client" /d "%~dp0client" cmd /k "if not exist node_modules (npm install) & npm run dev"

echo.
echo ============================================================
echo  All three launched in separate windows.
echo  Open the app:  http://localhost:5173
echo  (Close each window to stop that service.)
echo ============================================================
pause
