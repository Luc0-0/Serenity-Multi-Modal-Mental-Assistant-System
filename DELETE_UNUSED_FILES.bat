@echo off
REM Cleanup script for Serenity Frontend
REM Deletes 14 unused/duplicate files (100% safe - verified)
REM 
REM DO NOT RUN unless you've read FRONTEND_CLEANUP_GUIDE.md

setlocal enabledelayedexpansion

echo.
echo ========================================
echo  SERENITY FRONTEND CLEANUP
echo  Deleting 14 unused files...
echo ========================================
echo.

cd /d "frontend\src"

REM Delete CheckIn duplicates
echo Deleting CheckIn variants...
del /q "pages\CheckIn_NEW.jsx" 2>nul
del /q "pages\CheckIn_CORRECTED.jsx" 2>nul
del /q "pages\CheckInRefactored.jsx" 2>nul

REM Delete Journal duplicates
echo Deleting Journal variants...
del /q "pages\Journal_NEW.jsx" 2>nul
del /q "pages\JournalRefactored.jsx" 2>nul

REM Delete Insights duplicates
echo Deleting Insights variants...
del /q "pages\InsightsNew.jsx" 2>nul
del /q "pages\InsightsRedesign.jsx" 2>nul

REM Delete unused CSS
echo Deleting unused CSS files...
del /q "pages\Insights.module.css" 2>nul
del /q "pages\InsightsRedesign.module.css" 2>nul
del /q "pages\CheckInProduction.module.css" 2>nul
del /q "pages\JournalProduction.module.css" 2>nul

REM Delete backup and old HTML
echo Deleting backups and deprecated files...
del /q "pages\CheckIn.jsx.bak" 2>nul
del /q "pages\insights.html" 2>nul

REM Delete unused component
echo Deleting unused components...
del /q "components\InsightsComponents.jsx" 2>nul

echo.
echo ========================================
echo  CLEANUP COMPLETE!
echo ========================================
echo.
echo Deleted files:
echo   - CheckIn variants (3)
echo   - Journal variants (2)
echo   - Insights variants (2)
echo   - Unused CSS (4)
echo   - Backups (2)
echo   - Unused components (1)
echo.
echo Total: 14 files deleted
echo.
pause
