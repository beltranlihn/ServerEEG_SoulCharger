@echo off
chcp 65001 > nul
title Soul Charger Launcher
cd /d "%~dp0"

echo.
echo ============================================================
echo            SOUL CHARGER - AUTO LAUNCHER
echo ============================================================
echo.

REM --- 1. Liberar puertos 3000 (relay) y 5500 (web) ---
echo [1/4] Liberando puertos 3000 y 5500...
call npx --yes kill-port 3000 5500 >nul 2>&1
timeout /t 1 /nobreak > nul

REM --- 2. Iniciar relay + servidor web (un solo proceso) ---
echo [2/4] Iniciando Relay OSC y Servidor Web...
start "Soul Charger Relay" /D "%~dp0backend" cmd /k "npm start"

REM Esperar a que arranquen
timeout /t 4 /nobreak > nul

REM --- 3. Detectar navegador compatible con Web Bluetooth (Chrome / Edge) ---
echo [3/4] Detectando navegador compatible con Web Bluetooth...
set "BROWSER="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe"        set "BROWSER=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"  set "BROWSER=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"        set "BROWSER=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"       set "BROWSER=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if not defined BROWSER if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"  set "BROWSER=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"

REM --- 4. Abrir Admin Panel + ventana de Research (resumen / circulos) ---
echo [4/4] Abriendo Admin Panel y vista Research...
if defined BROWSER (
    echo Usando: "%BROWSER%"
    start "" "%BROWSER%" --new-window "http://localhost:5500/soul-charger-admin.html"
    timeout /t 1 /nobreak > nul
    start "" "%BROWSER%" --new-window "http://localhost:5500/soul-charger-admin.html?view=research"
) else (
    echo ADVERTENCIA: No se detecto Chrome ni Edge. Web Bluetooth puede NO funcionar.
    echo Instala Google Chrome o Microsoft Edge para que el emparejamiento BT funcione.
    start "" "http://localhost:5500/soul-charger-admin.html"
    start "" "http://localhost:5500/soul-charger-admin.html?view=research"
)

echo.
echo ============================================================
echo   Soul Charger esta corriendo:
echo   - Admin:    http://localhost:5500/soul-charger-admin.html
echo   - Research: http://localhost:5500/soul-charger-admin.html?view=research
echo   - App:      http://localhost:5500/soul-charger-app.html
echo   - Relay:    ws://localhost:3000  (OSC -^> 127.0.0.1:8000)
echo.
echo   Para apagar: cierra la ventana negra del relay.
echo ============================================================
echo.
timeout /t 6 > nul
exit
