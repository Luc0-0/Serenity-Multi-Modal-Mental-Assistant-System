@echo off
REM Setup Test User with Demo Data
cd /d "%~dp0"
echo Setting up test user with 7 days of emotion data...
echo.
python setup_test_user_with_data.py
echo.
pause
