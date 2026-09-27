@echo off
setlocal
title Tongjisheng2 Stop Server
powershell -NoProfile -ExecutionPolicy Bypass -Command "$conns = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue; if ($conns) { $procIds = $conns.OwningProcess | Sort-Object -Unique; foreach ($procId in $procIds) { Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue }; Write-Host ('Stopped: ' + ($procIds -join ', ')) } else { Write-Host 'No dev server on 5173' }; Start-Sleep -Milliseconds 500; if (Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue) { Write-Host 'Still listening on 5173' -ForegroundColor Red } else { Write-Host 'Port 5173 closed' -ForegroundColor Green }"
pause
