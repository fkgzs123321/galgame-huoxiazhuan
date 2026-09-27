$f1 = 'e:\Games\写卡\tavern_helper_template\src\不要玩弄我的鸡吧-forge\数据库\chatSheets.json'
$f2 = 'e:\Games\写卡\tavern_helper_template\src\不要玩弄我的鸡吧-forge\世界书\[SPV]表格模板JSON.txt'
$c1 = Get-Content -LiteralPath $f1 -Raw
$c2 = Get-Content -LiteralPath $f2 -Raw
Write-Host ("chatSheets.json size: " + $c1.Length)
Write-Host ("[SPV]表格模板JSON.txt size: " + $c2.Length)
Write-Host ("Are equal: " + ($c1 -eq $c2))
