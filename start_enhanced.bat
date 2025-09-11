@echo off
echo Starting Prompt Battle WebGame Enhanced Server...
echo.

cd backend

echo Installing dependencies...
call npm install

echo.
echo Starting enhanced server with WebSocket support...
echo Server will be available at: http://localhost:3000
echo.

call npm run dev
