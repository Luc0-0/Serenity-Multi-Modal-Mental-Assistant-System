# Start the FastAPI server in background
Write-Host "Starting FastAPI server..."
$serverProcess = Start-Process -FilePath python -ArgumentList "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000" -PassThru -NoNewWindow

Write-Host "Server PID: $($serverProcess.Id)"
Write-Host "Waiting for server to start..."
Start-Sleep -Seconds 3

Write-Host "`nRunning API tests..."
python test_api_endpoints.py

Write-Host "`nKilling server (PID: $($serverProcess.Id))..."
Stop-Process -Id $serverProcess.Id -Force

Write-Host "Done!"
