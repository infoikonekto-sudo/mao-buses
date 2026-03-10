@echo off
echo ========================================
echo   SUBIR FIX DE RUTAS Y SIDEBAR
echo ========================================
echo.
cd /d "c:\Users\ludin\Desktop\mao salidas\colegio-roosevelt"

echo 1. Preparando fixes...
git add .
git commit -m "fix: solucionar error 404 de rutas con vercel.json y mejorar contraste del sidebar"

echo 2. Subiendo a GitHub...
git push origin main

echo.
echo ========================================
echo   PROCESO COMPLETADO
echo ========================================
pause
