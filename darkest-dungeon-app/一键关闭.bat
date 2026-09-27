@echo off
setlocal
chcp 65001 >nul

echo [INFO] Stopping Darkest Dungeon dev server...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$pattern = '--port 3000 --strictPort'; $targets = @(); $targets += Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine -and $_.CommandLine.Contains($pattern) } | Select-Object -ExpandProperty ProcessId; if ($targets.Count -eq 0) { $targets += Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique }; $targets = $targets | Sort-Object -Unique; if ($targets.Count -gt 0) { foreach ($t in $targets) { taskkill /PID $t /T /F 2>$null | Out-Null }; Write-Host '[OK] Server stopped.' } else { Write-Host '[INFO] No running server found.' }"
ping -n 2 127.0.0.1 >nul
endlocal
