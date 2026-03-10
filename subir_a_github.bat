@echo off
echo ========================================
echo   DESPLIEGUE: FILTROS BUS + SISTEMA RBAC
echo ========================================
echo.
cd /d "c:\Users\ludin\Desktop\mao salidas\colegio-roosevelt"

echo 1. Sincronizando nuevas funcionalidades...
git add .
git commit -m "feat: implementar filtros de bus (ruta/grado) y sistema de gestión de usuarios con permisos (RBAC)"

echo 2. Subiendo a GitHub...
git push origin main

echo.
echo ========================================
echo   PROCESO COMPLETADO
echo ========================================
pause
