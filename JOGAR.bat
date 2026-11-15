@echo off
title Detetive - Servidor
cd /d "%~dp0"

echo ============================================
echo   DETETIVE - Servidor do jogo
echo ============================================
echo.

if not exist "node_modules" (
  echo Instalando dependencias pela primeira vez...
  call npm install
  echo.
)

echo Iniciando servidor...
echo.
echo Para jogar no celular, use o endereco "Rede local" abaixo.
echo Feche esta janela para encerrar o servidor.
echo.

set OPEN_BROWSER=1
node server.js

pause
