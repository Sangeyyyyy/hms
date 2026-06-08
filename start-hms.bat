@echo off
setlocal EnableDelayedExpansion
title DNSC Hostel Management System — Server Startup
color 0A

echo.
echo  =====================================================
echo    DNSC Hostel Management System
echo    Local Network Server Startup
echo  =====================================================
echo.

:: -------------------------------------------------------
:: STEP 1 — Detect Local IP Address
:: -------------------------------------------------------
echo  [1/5] Detecting local IP address...

for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    set RAW_IP=%%a
    set LOCAL_IP=!RAW_IP: =!
    goto :IP_FOUND
)

:IP_FOUND
if "%LOCAL_IP%"=="" (
    echo  [ERROR] Could not detect local IP. Make sure you are connected to a network.
    pause
    exit /b 1
)

echo  [OK] Local IP detected: %LOCAL_IP%
echo.

:: -------------------------------------------------------
:: STEP 2 — Check if MySQL / Laragon is running
:: -------------------------------------------------------
echo  [2/5] Checking if MySQL is running...

sc query MySQL57 >nul 2>&1
if %errorlevel%==0 (
    echo  [OK] MySQL service is running.
) else (
    sc query MySQL80 >nul 2>&1
    if %errorlevel%==0 (
        echo  [OK] MySQL service is running.
    ) else (
        echo  [WARN] MySQL service not detected. Make sure Laragon is started!
        echo  [WARN] The API will fail to connect to the database without MySQL.
        echo.
        pause
    )
)
echo.

:: -------------------------------------------------------
:: STEP 3 — Update Web App .env.local with correct IP
:: -------------------------------------------------------
echo  [3/5] Configuring Web App to use IP: %LOCAL_IP%...

set ENV_FILE=apps\web\.env.local
set TEMP_ENV=apps\web\.env.local.tmp

:: Rewrite .env.local with the correct API URL
(
    for /f "usebackq delims=" %%L in ("%ENV_FILE%") do (
        set LINE=%%L
        echo !LINE! | findstr /c:"NEXT_PUBLIC_API_URL" >nul
        if !errorlevel!==0 (
            echo NEXT_PUBLIC_API_URL=http://%LOCAL_IP%:3001
        ) else (
            echo !LINE!
        )
    )
) > "%TEMP_ENV%"

move /y "%TEMP_ENV%" "%ENV_FILE%" >nul
echo  [OK] .env.local updated: NEXT_PUBLIC_API_URL=http://%LOCAL_IP%:3001
echo.

:: -------------------------------------------------------
:: STEP 4 — Start the API Server (NestJS)
:: -------------------------------------------------------
echo  [4/5] Starting API server on port 3001...

start "HMS — API Server" cmd /k "cd /d %~dp0apps\api && echo  Starting NestJS API... && npm run start:dev"

:: Wait a few seconds so API can begin initializing
timeout /t 5 /nobreak >nul
echo  [OK] API server window opened.
echo.

:: -------------------------------------------------------
:: STEP 5 — Start the Web Server (Next.js)
:: -------------------------------------------------------
echo  [5/5] Starting Web server on port 3000...

start "HMS — Web Server" cmd /k "cd /d %~dp0apps\web && echo  Starting Next.js Web App... && npm run dev -- --hostname 0.0.0.0"

timeout /t 5 /nobreak >nul
echo  [OK] Web server window opened.
echo.

:: -------------------------------------------------------
:: DONE — Print Access Info
:: -------------------------------------------------------
echo  =====================================================
echo.
echo    HMS is starting up! Allow 15-30 seconds for
echo    both servers to fully initialize.
echo.
echo    ACCESS URLS:
echo    -----------------------------------------------
echo    Manager  (this PC) : http://localhost:3000
echo    Front Desk (LAN)   : http://%LOCAL_IP%:3000
echo    API Endpoint       : http://%LOCAL_IP%:3001
echo    API Docs (Swagger) : http://%LOCAL_IP%:3001/api
echo.
echo    Share this URL with the Front Desk:
echo    >>> http://%LOCAL_IP%:3000 <<<
echo.
echo  =====================================================
echo.
echo  [INFO] To stop servers, close the two server windows.
echo  [INFO] Both computers must be on the same WiFi/LAN.
echo.

:: Open the browser for the manager after a delay
timeout /t 12 /nobreak >nul
start "" "http://localhost:3000"

echo  [OK] Browser opened for manager.
echo.
pause
