@echo off
REM ============================================================
REM  Sentinel AI - show local status on WINDOWS
REM ============================================================
echo ---------------- Sentinel AI - local status ----------------
call :check "MongoDB    " 27017
call :check "Backend API" 5001
call :check "MQTT broker" 1883
call :check "AI engine  " 5002
call :check "Web client " 5173
echo ------------------------------------------------------------
echo  Open the app:  http://localhost:5173
echo  AI feed (after worker login):  http://localhost:5002/video_feed/0
echo.
pause
exit /b

:check
powershell -NoProfile -Command "if(Test-NetConnection -ComputerName 127.0.0.1 -Port %~2 -WarningAction SilentlyContinue -InformationLevel Quiet){Write-Host '   [UP]   %~1  (port %~2)'}else{Write-Host '   [DOWN] %~1  (port %~2)'}"
exit /b
