@echo off
echo ========================================
echo   ULTIMO FIX DE ICONOS Y RUTAS
echo ========================================
echo.
cd /d "c:\Users\ludin\Desktop\mao salidas\colegio-roosevelt"

echo 1. Sincronizando cambios...
git add .
git commit -m "fix: restaurar ruta absoluta de iconos para evitar 404 en subrutas"

echo 2. Subiendo a GitHub...
git push origin main

echo.
echo ========================================
echo   PROCESO COMPLETADO
echo ========================================
pause
