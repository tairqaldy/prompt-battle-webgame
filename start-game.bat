@echo off
title Prompt Battle WebGame - Quick Start
color 0A

echo.
echo ==========================================
echo   🎯 PROMPT BATTLE WEBGAME - QUICK START
echo ==========================================
echo.

:menu
echo Choose startup option:
echo.
echo [1] Local only (localhost:3000)
echo [2] Local + ngrok (public access)
echo [3] ngrok only (server already running)
echo [4] Setup ngrok authtoken
echo [5] Kill all Node processes
echo [6] Show network info
echo [0] Exit
echo.

set /p choice="Enter your choice (0-6): "

if "%choice%"=="1" goto local
if "%choice%"=="2" goto ngrok
if "%choice%"=="3" goto ngrok-only
if "%choice%"=="4" goto setup-ngrok
if "%choice%"=="5" goto kill
if "%choice%"=="6" goto network
if "%choice%"=="0" goto exit
goto menu

:local
echo.
echo 🚀 Starting local server...
echo.
cd backend
start "Prompt Battle Server" cmd /k "node server.js"
echo ✅ Server starting on http://localhost:3000
echo.
pause
goto menu

:ngrok
echo.
echo 🚀 Starting server + ngrok...
echo.
cd backend
start "Prompt Battle Server" cmd /k "node server.js"
timeout /t 3 /nobreak > nul
cd ..
start "ngrok Tunnel" cmd /k "ngrok.exe http 3000"
echo ✅ Server starting on http://localhost:3000
echo ✅ ngrok tunnel starting...
echo.
echo 📱 Check the ngrok window for your public URL!
echo.
pause
goto menu

:ngrok-only
echo.
echo 🌐 Starting ngrok tunnel...
echo.
start "ngrok Tunnel" cmd /k "ngrok.exe http 3000"
echo ✅ ngrok tunnel starting...
echo 📱 Check the ngrok window for your public URL!
echo.
pause
goto menu

:setup-ngrok
echo.
echo 🔑 Setting up ngrok authtoken...
echo.
echo 1. Go to: https://dashboard.ngrok.com/get-started/your-authtoken
echo 2. Copy your authtoken
echo 3. Paste it below
echo.
set /p authtoken="Enter your ngrok authtoken: "
ngrok.exe config add-authtoken %authtoken%
echo.
echo ✅ ngrok authtoken configured!
echo You can now use options 2 and 3 for public access.
echo.
pause
goto menu

:kill
echo.
echo 🛑 Killing all Node processes...
taskkill /f /im node.exe 2>nul
echo ✅ All Node processes stopped
echo.
pause
goto menu

:network
echo.
echo 🌐 Network Information:
echo.
ipconfig | findstr "IPv4"
echo.
echo Your game can be accessed at:
echo http://YOUR_IP:3000 (replace YOUR_IP with the address above)
echo.
pause
goto menu

:exit
echo.
echo 👋 Goodbye!
timeout /t 2 /nobreak > nul
exit
