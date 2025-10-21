@echo off
setlocal
for %%i in ("%~dp0..") do set "PROJECT_ROOT=%%~fi"
set "NODE_DIR=%PROJECT_ROOT%\.tools\node-v20.19.0-win-x64"
set "NPM_CLI=%NODE_DIR%\node_modules\npm\bin\npm-cli.js"
if not exist "%NODE_DIR%\node.exe" (
  echo Node 20.19.0 not found at "%NODE_DIR%".
  exit /b 1
)
set "PATH=%NODE_DIR%;%NODE_DIR%\node_modules\npm\bin;%PATH%"
"%NODE_DIR%\node.exe" "%NPM_CLI%" %*
