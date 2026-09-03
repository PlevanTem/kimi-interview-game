@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [Lightline] Node.js was not found in PATH.
  echo Install Node.js or open index.html directly.
  pause
  exit /b 1
)

set "PORT=5183"
for /f %%P in ('powershell.exe -NoProfile -Command "$p=5183; while($p -lt 5200){$l=[Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,$p); try{$l.Start();$l.Stop();$p;break}catch{$p++}}"') do set "PORT=%%P"

if /I not "%~1"=="--no-open" start "" "http://127.0.0.1:%PORT%/"
echo [Lightline] Running at http://127.0.0.1:%PORT%/
echo Close this window to stop the local server.
node serve.mjs %PORT%

if errorlevel 1 (
  echo.
  echo [Lightline] The local server stopped with an error.
  pause
)
