@echo off
echo ========================================
echo   ULTIMO AJUSTE: SIDEBAR Y CONSOLA
echo ========================================
echo.
cd /d "c:\Users\ludin\Desktop\mao salidas\colegio-roosevelt"

echo 1. Sincronizando cambios finales...
git add .
git commit -m "fix: ocultar boton cierre sidebar en desktop y limpiar referencias de iconos"

echo 2. Subiendo a GitHub...
git push origin main

echo.
echo ========================================
echo   PROCESO COMPLETADO
echo ========================================
pause
