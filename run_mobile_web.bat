@echo off
REM ============================================================
REM  Run the Flutter mobile app in Brave (as a web app) - WINDOWS
REM  Requirements: Flutter in PATH, Brave installed.
REM  Start the backend first with run_local.bat
REM ============================================================
cd /d "%~dp0mobile"

REM Locate Brave (system-wide install, then per-user install)
set "CHROME_EXECUTABLE=C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
if not exist "%CHROME_EXECUTABLE%" set "CHROME_EXECUTABLE=%LOCALAPPDATA%\BraveSoftware\Brave-Browser\Application\brave.exe"

if not exist "%CHROME_EXECUTABLE%" (
  echo Could not find Brave automatically.
  echo Edit this file and set CHROME_EXECUTABLE to your brave.exe path,
  echo or just run:  flutter run -d web-server --web-port 8080
  echo then open http://localhost:8080 in Brave manually.
  pause
  exit /b
)

echo Using Brave: %CHROME_EXECUTABLE%
call flutter pub get
echo Launching PPE app in Brave (http://localhost:8080) ...
call flutter run -d chrome --web-port 8080
pause
