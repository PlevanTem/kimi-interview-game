@echo off
setlocal
set "LIGHTLINE_GAME=%~dp0src\godot"
set "LIGHTLINE_ENGINE=%~dp0..\..\.tools\godot-4.7.2\Godot_v4.7.2-stable_win64.exe"

if not exist "%LIGHTLINE_ENGINE%" (
  echo Godot executable not found:
  echo %LIGHTLINE_ENGINE%
  pause
  exit /b 1
)

start "Lightline Demo" "%LIGHTLINE_ENGINE%" --path "%LIGHTLINE_GAME%"
exit /b 0
