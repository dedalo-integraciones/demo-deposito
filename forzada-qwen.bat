@echo off
setlocal
cd /d "%~dp0"
title Reseteo Total GitHub

echo =======================================================
echo   RESETEO TOTAL - GitHub queda IDENTICO a esta carpeta
echo =======================================================
echo.
echo Carpeta de trabajo: %cd%
echo.

echo [CHECK 1] Verifico que el ZIP este bien descomprimido...
if not exist package.json (
    echo.
    echo ERROR: no encuentro package.json en esta carpeta.
    echo Saca el CONTENIDO del zip adentro de esta carpeta
    echo (no la carpeta raiz del zip) y volvelo a ejecutar.
    pause
    exit /b 1
)
if not exist src (
    echo.
    echo ERROR: no encuentro la carpeta src.
    echo Revisa que el contenido del zip este completo.
    pause
    exit /b 1
)
echo OK: package.json y src presentes.

echo.
echo [CHECK 2] Blindaje de .gitignore (no sube basura)...
if not exist .gitignore type nul > .gitignore
findstr /x /c:"node_modules/" .gitignore >nul 2>&1 || echo node_modules/ >> .gitignore
findstr /x /c:"dist/" .gitignore >nul 2>&1 || echo dist/ >> .gitignore
findstr /x /c:".env" .gitignore >nul 2>&1 || echo .env >> .gitignore
findstr /x /c:".env.local" .gitignore >nul 2>&1 || echo .env.local >> .gitignore

echo.
echo [1/8] Limpio cualquier git previo...
if exist .git rmdir /s /q .git

echo.
echo [2/8] Config de usuario por si falta...
git config user.email >nul 2>&1 || git config user.email "dedalo.integraciones@gmail.com"
git config user.name >nul 2>&1 || git config user.name "dedalo-integraciones"

echo.
echo [3/8] git init directo en main...
git init -b main 2>nul || git init
git branch -M main

echo.
echo [4/8] git add -A (todo el contenido)...
git add -A

echo.
echo [5/8] Commit con el estado completo...
git commit -m "RESETEO TOTAL: estado completo del proyecto"

echo.
echo [6/8] Conecto el remoto...
git remote add origin https://github.com/dedalo-integraciones/depositobombal.git 2>nul
git remote set-url origin https://github.com/dedalo-integraciones/depositobombal.git

echo.
echo [7/8] FORCE PUSH: piso GitHub completo con esta carpeta...
git push --force --set-upstream origin main

echo.
echo [8/8] Push normal extra para FORZAR el webhook de Vercel...
git commit --allow-empty -m "trigger deploy vercel"
git push origin main

echo.
echo =======================================================
echo   VERIFICACION AUTOMATICA
echo =======================================================
echo --- Ultimos commits LOCALES:
git log -n 2 --oneline
echo --- Ultimos commits en GITHUB:
git fetch origin --prune
git log -n 2 --oneline origin/main
echo --- DIFF local vs GitHub (DEBE quedar vacio):
git diff origin/main --stat

echo.
echo =======================================================
echo   LISTO. En Vercel debe aparecer un deploy nuevo con
echo   el mensaje "trigger deploy vercel". Esperalo verde
echo   y mira produccion con Ctrl+Shift+R o incognito.
echo =======================================================
pause