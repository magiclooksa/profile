@echo off
chcp 65001 >nul
cd /d "%~dp0"
title MAGIC LOOK - Install
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed.
  where winget >nul 2>nul
  if errorlevel 1 (
    echo Download Node.js LTS from https://nodejs.org then run install.cmd again.
    start https://nodejs.org
    pause
    exit /b 1
  )
  echo Installing Node.js LTS with winget...
  winget install --id OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements
  echo.
  echo Node.js installed. Close this window and run install.cmd again.
  pause
  exit /b 0
)
node install.mjs %*
pause
