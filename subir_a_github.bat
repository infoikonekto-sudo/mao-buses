@echo off
echo ========================================
echo   SUBIR CAMBIOS FINALIZADOS A GITHUB
echo ========================================
echo.
cd /d "c:\Users\ludin\Desktop\mao salidas\colegio-roosevelt"

echo 1. Preparando cambios...
git add .
git commit -m "fix: corregir logo gigante y error 404 de assets en vercel"

echo 2. Subiendo a GitHub...
git push -u origin main

echo.
echo ========================================
echo   PROCESO COMPLETADO
echo ========================================
pause
