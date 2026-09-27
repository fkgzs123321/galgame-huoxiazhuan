# 抓取助手: 通过本地代理 127.0.0.1:10241 获取网页
param(
  [Parameter(Mandatory=$true)][string]$Url,
  [string]$Out = '',
  [string]$Encoding = 'utf-8',
  [int]$Timeout = 30
)
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$px = 'http://127.0.0.1:10241'
$ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
$hdr = @{
  'Accept' = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
  'Accept-Language' = 'zh-CN,zh;q=0.9,en;q=0.8'
}
try {
  $r = Invoke-WebRequest -Uri $Url -UserAgent $ua -Proxy $px -Headers $hdr -TimeoutSec $Timeout -UseBasicParsing -ErrorAction Stop
  if ($Out -ne '') {
    [System.IO.File]::WriteAllText($Out, $r.Content, [System.Text.Encoding]::UTF8)
    Write-Output ("OK   status={0} len={1} -> {2}" -f $r.StatusCode, $r.Content.Length, $Out)
  } else {
    Write-Output ("OK   status={0} len={1}" -f $r.StatusCode, $r.Content.Length)
    Write-Output $r.Content
  }
} catch {
  Write-Output ("FAIL {0}  {1}" -f $Url, $_.Exception.Message)
}
