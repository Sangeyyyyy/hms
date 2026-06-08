@echo off
title DNSC HMS — Shutdown
color 0C

echo.
echo  =====================================================
echo    DNSC Hostel Management System — Shutting Down
echo  =====================================================
echo.

echo  Stopping Node.js processes (API + Web)...
taskkill /f /im node.exe >nul 2>&1
echo  [OK] All Node.js servers stopped.

echo  Restoring .env.local to localhost...

set ENV_FILE=apps\web\.env.local
set TEMP_ENV=apps\web\.env.local.tmp

(
    for /f "usebackq delims=" %%L in ("%ENV_FILE%") do (
        set LINE=%%L
        echo !LINE! | findstr /c:"NEXT_PUBLIC_API_URL" >nul
        if !errorlevel!==0 (
            echo NEXT_PUBLIC_API_URL=http://localhost:3001
        ) else (
            echo !LINE!
        )
    )
) > "%TEMP_ENV%"
setlocal EnableDelayedExpansion
move /y "%TEMP_ENV%" "%ENV_FILE%" >nul

echo  [OK] .env.local restored to localhost.
echo.
echo  HMS has been shut down.
echo.
pause
