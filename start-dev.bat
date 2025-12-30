@echo off
echo Starting Flypink Development Servers...
echo.

:: Start Backend in new window
start "Flypink Backend" cmd /k "cd /d %~dp0crates\api-server && cargo run"

:: Wait a moment for backend to start
timeout /t 3 /nobreak > nul

:: Start Frontend in new window
start "Flypink Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Both servers are starting in separate windows.
echo - Backend: http://localhost:3000
echo - Frontend: http://localhost:5173
echo.
pause

