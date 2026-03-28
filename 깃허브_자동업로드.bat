@echo off
echo ========================================================
echo   [PE Memorizer] Auto Upload Script for GitHub
echo ========================================================
echo.

git remote | findstr "origin" > nul
if errorlevel 1 (
    echo [*] No remote found. Adding origin...
    git remote add origin https://github.com/80hkim/pe-exam-memorizer.git
    git branch -M main
)

echo [1/3] Adding files to git...
git add .

echo [2/3] Committing changes...
git commit -m "Auto update"

echo [3/3] Pushing to GitHub...
git push -u origin main

echo.
echo ========================================================
echo   Upload complete! You can close this window.
echo ========================================================
pause
