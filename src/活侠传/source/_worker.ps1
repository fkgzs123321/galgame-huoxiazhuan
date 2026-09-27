param([int]$Slice = 0, [int]$Of = 5)
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$PX  = 'http://127.0.0.1:10241'
$UA  = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
$base = Join-Path $PSScriptRoot '_raw'
$out  = Join-Path $base 'wiki'
$all  = [System.IO.File]::ReadAllLines((Join-Path $base '_mdpaths.txt'), [System.Text.Encoding]::UTF8)
$mine = @()
for ($i = 0; $i -lt $all.Count; $i++) { if (($i % $Of) -eq $Slice) { $mine += $all[$i] } }
$mirrors = @(
  'https://gh-proxy.com/https://raw.githubusercontent.com/Mr-Smilin/LoM-wiki/main/docs/',
  'https://raw.githubusercontent.com/Mr-Smilin/LoM-wiki/main/docs/',
  'https://ghproxy.net/https://raw.githubusercontent.com/Mr-Smilin/LoM-wiki/main/docs/',
  'https://cdn.jsdelivr.net/gh/Mr-Smilin/LoM-wiki@main/docs/'
)
$ok = 0; $skip = 0; $fail = @()
foreach ($p in $mine) {
  $l = Join-Path $out ($p -replace '/', '\')
  if ((Test-Path $l) -and (Get-Item $l).Length -gt 0) { $skip++; continue }
  $d = [System.IO.Path]::GetDirectoryName($l)
  if (-not (Test-Path $d)) { New-Item -ItemType Directory -Force -Path $d | Out-Null }
  $done = $false
  foreach ($m in $mirrors) {
    if ($done) { break }
    for ($t = 1; $t -le 2 -and -not $done; $t++) {
      try {
        $r = Invoke-WebRequest -Uri ($m + $p) -UserAgent $UA -Proxy $PX -TimeoutSec 25 -UseBasicParsing -ErrorAction Stop
        [System.IO.File]::WriteAllText($l, $r.Content, [System.Text.Encoding]::UTF8)
        $ok++; $done = $true
      } catch { Start-Sleep -Milliseconds 250 }
    }
  }
  if (-not $done) { $fail += $p }
}
[System.IO.File]::WriteAllLines((Join-Path $base "_fail_$Slice.txt"), $fail, [System.Text.Encoding]::UTF8)
Write-Output "slice $Slice : new=$ok skip=$skip fail=$($fail.Count)"
