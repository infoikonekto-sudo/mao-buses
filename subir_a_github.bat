@echo off
echo ========================================
echo   RESTAURAR DISEÑO: BARRA AZUL UNIFICADA
echo ========================================
echo.
cd /d "c:\Users\ludin\Desktop\mao salidas\colegio-roosevelt"

echo 1. Sincronizando estilos...
git add .
git commit -m "style: restaurar color azul en header y unificar con sidebar"

echo 2. Subiendo a GitHub...
git push origin main

echo.
echo ========================================
echo   PROCESO COMPLETADO
echo ========================================
pause
