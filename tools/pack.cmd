@echo off
setlocal

REM pack.ps1 wrapper that bypasses ExecutionPolicy (no signing required)
REM Usage:
REM   tools\pack.cmd
REM   tools\pack.cmd -To 12

pushd "%~dp0.." >nul

where pwsh >nul 2>&1
if %ERRORLEVEL%==0 (
  pwsh -NoProfile -ExecutionPolicy Bypass -File "%~dp0pack.ps1" %*
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0pack.ps1" %*
)

set ec=%ERRORLEVEL%
popd >nul
exit /b %ec%