# 抓取助手 v2
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$script:PX  = 'http://127.0.0.1:10241'
$script:UA  = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
$script:DIR = 'E:\Games\写卡\tavern_helper_template\src\活侠传\source\_raw'
New-Item -ItemType Directory -Force -Path $script:DIR | Out-Null

function Get-Text([string]$Url, [int]$Timeout = 40) {
  try {
    $r = Invoke-WebRequest -Uri $Url -UserAgent $script:UA -Proxy $script:PX -TimeoutSec $Timeout -UseBasicParsing -ErrorAction Stop
    return $r.Content
  } catch {
    Write-Host ("FAIL {0} :: {1}" -f $_.Exception.Message, $Url)
    return $null
  }
}

function Save-Text([string]$Url, [string]$Name, [int]$Timeout = 40) {
  $c = Get-Text $Url $Timeout
  if ($null -eq $c) { Write-Host "FAIL -> $Name"; return }
  $p = Join-Path $script:DIR $Name
  [System.IO.File]::WriteAllText($p, $c, [System.Text.Encoding]::UTF8)
  $t = ''
  if ($c -match '(?s)<title[^>]*>(.*?)</title>') { $t = $matches[1] }
  Write-Host ("OK len={0,8} title={1} -> {2}" -f $c.Length, $t, $Name)
}

function Strip-Html([string]$Html) {
  $h = [regex]::Replace($Html, '(?s)<script.*?</script>', ' ')
  $h = [regex]::Replace($h, '(?s)<style.*?</style>', ' ')
  $h = [regex]::Replace($h, '(?s)<head.*?</head>', ' ')
  $h = [regex]::Replace($h, '<br\s*/?>', "`n")
  $h = [regex]::Replace($h, '</(p|div|li|tr|h1|h2|h3|h4|table)>', "`n")
  $h = [regex]::Replace($h, '(?s)<[^>]+>', ' ')
  $h = $h -replace '&nbsp;', ' ' -replace '&amp;', '&' -replace '&quot;', '"' -replace '&#39;', "'" -replace '&lt;', '<' -replace '&gt;', '>'
  $h = [regex]::Replace($h, '[ \t]+', ' ')
  $h = [regex]::Replace($h, '(\r?\n){2,}', "`n")
  return $h.Trim()
}
