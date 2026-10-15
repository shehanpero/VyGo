# ============================================================================
#  VyGo - start backend + self-healing public tunnel
# ----------------------------------------------------------------------------
#  What it does
#    1. Starts the Spring Boot backend (H2 "dev" profile, auto-seeds demo data)
#       if it isn't already listening on :8080.
#    2. Opens a Cloudflare quick tunnel to :8080.
#    3. Writes the tunnel's public URL into Cloudflare KV (key "backend_origin")
#       so https://vygo-perovin.pages.dev proxies /api/* and /uploads/* here.
#
#  Result: after a reboot just run this script and the public site works again,
#  even though the tunnel URL is new each time. No redeploy needed.
#
#  Usage:  double-click start-vygo.cmd  (or)  powershell -ExecutionPolicy Bypass -File scripts\start-vygo.ps1
# ============================================================================
[CmdletBinding()]
param(
  [int]$BackendPort = 8080,
  [string]$KvNamespaceId = 'd6349ad6d3624af8a628b4a46dac131f',
  [string]$SiteUrl = 'https://vygo-perovin.pages.dev'
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
$Jar = Join-Path $RepoRoot 'backend\target\vygo-backend-1.0.0.jar'
$BackendDir = Join-Path $RepoRoot 'backend'
$ToolDir = Join-Path $env:LOCALAPPDATA 'vygo'
$LogsDir = Join-Path $ToolDir 'logs'
$Cloudflared = Join-Path $ToolDir 'cloudflared.exe'
$CloudflaredUrl = 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe'
$StartLog = Join-Path $LogsDir 'start-vygo.log'

New-Item -ItemType Directory -Force -Path $LogsDir | Out-Null

function Log($m) {
  $line = "[{0}] {1}" -f (Get-Date -Format 'HH:mm:ss'), $m
  Write-Host $line
  Add-Content -Path $StartLog -Value $line
}

# Load KEY=VALUE pairs from a .env file into the process environment so the
# backend child process inherits them. Blank lines and #comments are ignored.
function Import-DotEnv($path) {
  if (-not (Test-Path $path)) { return $false }
  Get-Content -LiteralPath $path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith('#')) { return }
    $idx = $line.IndexOf('=')
    if ($idx -lt 1) { return }
    $key = $line.Substring(0, $idx).Trim()
    $val = $line.Substring($idx + 1).Trim().Trim('"').Trim("'")
    Set-Item -Path "Env:$key" -Value $val
  }
  return $true
}

function Resolve-Java {
  $cmd = Get-Command java -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $jdk = Get-ChildItem (Join-Path $env:LOCALAPPDATA 'opencode\tools') -Recurse -Filter java.exe -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($jdk) { return $jdk.FullName }
  throw 'Java 21 not found. Install a JDK or put java on PATH.'
}

function Test-Port($port) {
  try { return [bool](Test-NetConnection -ComputerName 'localhost' -Port $port -InformationLevel Quiet -WarningAction SilentlyContinue) } catch { return $false }
}

function Wait-Healthy($timeoutSec) {
  $deadline = (Get-Date).AddSeconds($timeoutSec)
  while ((Get-Date) -lt $deadline) {
    try {
      $r = Invoke-WebRequest "http://localhost:$BackendPort/api/v1/health" -UseBasicParsing -TimeoutSec 5
      if ($r.StatusCode -eq 200) { return $true }
    } catch {}
    Start-Sleep -Seconds 2
  }
  return $false
}

Log '=================================================='
Log "VyGo start - $(Get-Date)"

# ---- 0. environment ---------------------------------------------------------
$DotEnv = Join-Path $RepoRoot '.env.deploy.local'
if (Import-DotEnv $DotEnv) {
  Log "loaded env from $DotEnv"
} else {
  Log "no $DotEnv found (email/SMS/face stay off unless VYGO_* vars are set in the environment)"
}

# ---- 1. backend -------------------------------------------------------------
if (Test-Port $BackendPort) {
  Log "backend already listening on :$BackendPort"
} else {
  if (-not (Test-Path $Jar)) { throw "Backend jar not found: $Jar  (build it with: mvn -f backend/pom.xml package -DskipTests)" }
  $java = Resolve-Java
  Log "starting backend: $java -jar $Jar"
  Start-Process -FilePath $java -ArgumentList '-jar', "`"$Jar`"", '--spring.profiles.active=dev' -WorkingDirectory $BackendDir -WindowStyle Minimized
  if (Wait-Healthy 120) { Log 'backend is healthy' } else { Log 'WARNING: backend did not report healthy within 120s (continuing anyway)' }
}

# ---- 1b. face service (optional, self-hosted) -------------------------------
$FacePort = if ($env:VYGO_FACE_URL -match ':(\d+)') { [int]$Matches[1] } else { 8100 }
if ($env:VYGO_FACE_ENABLED -eq 'true') {
  if (Test-Port $FacePort) {
    Log "face service already listening on :$FacePort"
  } else {
    $faceRun = Join-Path $RepoRoot 'face-service\run.cmd'
    if (Test-Path $faceRun) {
      Log "starting face service (first run installs DeepFace/TensorFlow, may take a while)"
      Start-Process -FilePath $faceRun -WorkingDirectory (Join-Path $RepoRoot 'face-service') -WindowStyle Minimized
      Start-Sleep -Seconds 3
    } else {
      Log "WARNING: VYGO_FACE_ENABLED=true but $faceRun not found"
    }
  }
} else {
  Log 'face service disabled (set VYGO_FACE_ENABLED=true to enable)'
}

# ---- 2. tunnel --------------------------------------------------------------
if (-not (Test-Path $Cloudflared)) {
  Log "downloading cloudflared -> $Cloudflared"
  Invoke-WebRequest $CloudflaredUrl -OutFile $Cloudflared -UseBasicParsing
}

$errLog = Join-Path $LogsDir 'tunnel.err.log'
$outLog = Join-Path $LogsDir 'tunnel.out.log'
Remove-Item $errLog, $outLog -ErrorAction SilentlyContinue

Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

Log "opening cloudflared tunnel -> http://localhost:$BackendPort"
Start-Process -FilePath $Cloudflared -ArgumentList 'tunnel', '--url', "http://localhost:$BackendPort", '--no-autoupdate' -RedirectStandardError $errLog -RedirectStandardOutput $outLog -WindowStyle Hidden

$url = $null
for ($i = 0; $i -lt 30 -and -not $url; $i++) {
  Start-Sleep -Seconds 2
  if (Test-Path $errLog) {
    $m = Select-String -Path $errLog -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -ErrorAction SilentlyContinue | Select-Object -Last 1
    if ($m) { $url = $m.Matches[0].Value }
  }
}
if (-not $url) { throw 'Could not obtain tunnel URL from cloudflared log' }
Log "tunnel url = $url"

# ---- 3. publish to KV -------------------------------------------------------
Log 'updating Cloudflare KV (backend_origin)'
$ok = $false
for ($try = 1; $try -le 2 -and -not $ok; $try++) {
  try {
    & npx.cmd --yes wrangler@latest kv key put backend_origin $url --namespace-id $KvNamespaceId --remote 2>&1 | Out-Host
    if ($LASTEXITCODE -eq 0) { $ok = $true }
  } catch { Log "KV update attempt $try failed: $($_.Exception.Message)" }
  if (-not $ok) { Start-Sleep -Seconds 3 }
}
if ($ok) { Log 'KV updated' } else { Log 'WARNING: could not update KV. Run: npx wrangler login' }

Log "DONE. Site: $SiteUrl"
