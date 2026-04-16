@echo off
echo ========================================
echo  Recuperando cambios de diagnostico
echo ========================================

cd /d "d:\SessDev\LITTLE CHUBBY WEBSITE"

echo.
echo [1/4] Cherry-picking commit 7e8d01e...
git cherry-pick 7e8d01e96d01fafa944c05c3ef5eb54457d97171 --no-edit
if %errorlevel% neq 0 (
    echo ERROR: Cherry-pick fallo. Revisa conflictos.
    pause
    exit /b 1
)

echo.
echo [2/4] Pushing a origin/main...
git push origin main
if %errorlevel% neq 0 (
    echo ERROR: Push fallo.
    pause
    exit /b 1
)

echo.
echo [3/4] Verificando...
git --no-pager log --oneline -5
echo.
echo [4/4] Verificando archivos...
if exist ".github\workflows\diagnose-social.yml" (echo   diagnose-social.yml  OK) else (echo   diagnose-social.yml  FALTA!)
if exist "scripts\social\diagnose.mjs" (echo   diagnose.mjs         OK) else (echo   diagnose.mjs         FALTA!)
if exist "scripts\social\platforms\meta.mjs" (echo   meta.mjs             OK) else (echo   meta.mjs             FALTA!)
if exist "scripts\social\post.mjs" (echo   post.mjs             OK) else (echo   post.mjs             FALTA!)

echo.
echo ========================================
echo  LISTO! Todo mergeado y pusheado.
echo ========================================
pause
