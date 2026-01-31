@echo off
setlocal

REM gate.ps1 wrapper that bypasses ExecutionPolicy (no signing required)
REM Usage:
REM   tools\gate.cmd
REM   tools\gate.cmd -To 6

pushd "%~dp0.." >nul

where pwsh >nul 2>&1
if %ERRORLEVEL%==0 (
  pwsh -NoProfile -ExecutionPolicy Bypass -File "%~dp0gate.ps1" %*
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0gate.ps1" %*
)

set ec=%ERRORLEVEL%
popd >nul
exit /b %ec%
