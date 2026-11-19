<#
  Applies a release zip made by release.py on the Windows Server.

    .\deploy\windows\install-release.ps1 -Zip C:\Downloads\magic-look-1.0.1-20261119-1530-code.zip

  Steps: check the zip's SHA-256 (when its .sha256 file is beside it), back up the live content
  (public/data, uploads, server.config.json), stop the service, extract the release over the site
  folder, npm ci, start the service. On start the server builds the pages from the new code.

  A "code" release never contains public/, so the content edited in the dashboard stays as it is.
  Run PowerShell as administrator. See docs/deploy-windows-server.md.
#>
param(
  [Parameter(Mandatory = $true)] [string] $Zip,
  [string] $Site = 'C:\sites\magic-look',
  [string] $Service = 'MagicLook'
)

$ErrorActionPreference = 'Stop'

function Step($message) { Write-Host "`n==> $message" -ForegroundColor Cyan }

if (-not (Test-Path $Zip)) { throw "Zip not found: $Zip" }
if (-not (Test-Path $Site)) { New-Item -ItemType Directory -Force $Site | Out-Null }

$checksumFile = "$Zip.sha256"
if (Test-Path $checksumFile) {
  Step 'Checking the SHA-256'
  $expected = ((Get-Content $checksumFile -Raw).Trim() -split '\s+')[0]
  $actual = (Get-FileHash $Zip -Algorithm SHA256).Hash.ToLower()
  if ($actual -ne $expected.ToLower()) { throw 'The zip does not match its .sha256 file: copy it again.' }
}

Step 'Backing up the live content'
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backup = Join-Path $Site "storage\backups\$stamp"
New-Item -ItemType Directory -Force $backup | Out-Null
foreach ($item in 'public\data', 'public\images\uploads', 'server.config.json') {
  $source = Join-Path $Site $item
  if (Test-Path $source) {
    $target = Join-Path $backup $item
    New-Item -ItemType Directory -Force (Split-Path $target -Parent) | Out-Null
    Copy-Item $source $target -Recurse -Force
  }
}
Write-Host "    $backup"

$hasService = $null -ne (Get-Service $Service -ErrorAction SilentlyContinue)
if ($hasService) {
  Step "Stopping the service $Service"
  Stop-Service $Service
}

try {
  Step 'Extracting the release'
  Expand-Archive -Path $Zip -DestinationPath $Site -Force
  Get-Content (Join-Path $Site 'RELEASE.json') -Raw | Write-Host

  Step 'Installing dependencies (npm ci)'
  Push-Location $Site
  try {
    npm ci
    if ($LASTEXITCODE -ne 0) { throw 'npm ci failed.' }
  } finally { Pop-Location }
} finally {
  if ($hasService) {
    Step "Starting the service $Service"
    Start-Service $Service
  }
}

if (-not (Test-Path (Join-Path $Site 'server.config.json'))) {
  Write-Host "`nNo dashboard password yet. Run in $Site : npm run set-password, then restart the service." -ForegroundColor Yellow
}
Write-Host "`nDone. The server rebuilds the pages on start; the site shows the new release in about a minute." -ForegroundColor Green
