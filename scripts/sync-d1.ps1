# ============================================================================
#  VyGo - sync the live H2 database into the Cloudflare D1 cloud copy
# ----------------------------------------------------------------------------
#  What it does
#    1. Exports the running/at-rest H2 file DB (backend/data/vygo.mv.db) to SQL
#       using the H2 Script tool. AUTO_SERVER lets it connect while the backend
#       holds the file lock, so the app can keep running.
#    2. Converts the H2 dump to SQLite/D1 SQL (scripts/h2-to-d1.js) and
#       validates it locally.
#    3. Re-loads the Cloudflare D1 database (drops + recreates + reinserts),
#       so the cloud copy matches the live DB.
#
#  Usage:  powershell -ExecutionPolicy Bypass -File scripts\sync-d1.ps1
#          powershell -ExecutionPolicy Bypass -File scripts\sync-d1.ps1 -Local   # local D1 instead of remote
#
#  Logs:   %LOCALAPPDATA%\vygo\logs\sync-d1.log
# ============================================================================
[CmdletBinding()]
param(
  [string]$DatabaseName = 'vygo',
  [switch]$Local
)

$ErrorActionPreference = 'Continue'
$RepoRoot = Split-Path -Parent $PSScriptRoot
$LogsDir = Join-Path $env:LOCALAPPDATA 'vygo\logs'
New-Item -ItemType Directory -Force -Path $LogsDir | Out-Null
$Log = Join-Path $LogsDir 'sync-d1.log'

function Log($m) {
  $line = "[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $m
  Write-Host $line
  Add-Content -Path $Log -Value $line
}

function Resolve-H2Jar {
  $root = Join-Path $env:USERPROFILE '.m2\repository\com\h2database\h2'
  $jar = Get-ChildItem $root -Recurse -Filter 'h2-*.jar' -ErrorAction SilentlyContinue |
    Sort-Object Name | Select-Object -Last 1
  if (-not $jar) { throw 'H2 jar not found under ~/.m2 (build the backend once: mvn -f backend/pom.xml package -DskipTests)' }
  return $jar.FullName
}

function Resolve-Node {
  $cmd = Get-Command node -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  throw 'node not found on PATH'
}

Log "=================================================="
Log "VyGo D1 sync - $((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))"

$h2Jar = Resolve-H2Jar
$node = Resolve-Node

$dataPrefix = (Join-Path $RepoRoot 'backend\data\vygo') -replace '\\', '/'
$url = "jdbc:h2:file:$dataPrefix;MODE=MySQL;DATABASE_TO_LOWER=TRUE;AUTO_SERVER=TRUE"
$dump = Join-Path $LogsDir 'h2dump.sql'
$d1Sql = Join-Path $LogsDir 'd1.sql'

Remove-Item $dump, $d1Sql -ErrorAction SilentlyContinue

# ---- 1. export H2 -----------------------------------------------------------
Log "exporting H2 -> $dump"
$args = @('-cp', $h2Jar, 'org.h2.tools.Script', '-url', $url, '-user', 'sa', '-script', $dump)
& java @args 2>&1 | Select-Object -Last 3 | Out-Host
if (-not (Test-Path $dump)) { throw 'H2 export failed (no dump produced)' }
Log "dump written: $((Get-Item $dump).Length) bytes"

# ---- 2. convert + validate --------------------------------------------------
Log 'converting H2 -> D1 SQL (with local validation)'
& $node (Join-Path $PSScriptRoot 'h2-to-d1.js') $dump $d1Sql '--validate' 2>&1 | Out-Host
if (-not (Test-Path $d1Sql)) { throw 'conversion failed (no d1.sql produced)' }

# ---- 3. load into D1 --------------------------------------------------------
$scope = if ($Local) { '--local' } else { '--remote' }
Log "loading into D1 '$DatabaseName' ($scope)"
Push-Location (Join-Path $RepoRoot 'frontend')
try {
  & npx.cmd --yes wrangler@latest d1 execute $DatabaseName $scope --file=$d1Sql 2>&1 | Out-Host
  if ($LASTEXITCODE -ne 0) { throw "wrangler d1 execute failed (exit code $LASTEXITCODE)" }
} finally {
  Pop-Location
}

Log "DONE. D1 '$DatabaseName' refreshed from live H2."
