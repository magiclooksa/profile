<#
  Magic Look: prepares the Windows server (IIS) for the static site and its web.config.
  تثبيت لوازم السيرفر لموقع النظرة الساحرة. شغّله مرة واحدة كمسؤول قبل رفع النسخة الجديدة.

  Run PowerShell AS ADMINISTRATOR on the server, from the folder that holds this file:

    powershell -ExecutionPolicy Bypass -File .\install-prerequisites.ps1

  Options:
    -WithNode       also install Application Request Routing (ARR) and turn its proxy on,
                    for the Node.js version of the site with the dashboard (deploy\windows).
    -MsiFolder D:\x use MSI files you downloaded yourself (rewrite_amd64_en-US.msi,
                    requestRouter_amd64.msi) when the server cannot download them.
    -SiteName "x"   the IIS site to check (bindings and certificate). Default: every site.

  What it does (safe to run again; anything already installed is skipped):
    1. Installs the IIS features the site uses: web server, static files, default document,
       custom error pages (for 404.html), static compression, and IIS Manager.
    2. Installs the "URL Rewrite" module. web.config needs it for the 301 redirects and HSTS;
       without it IIS answers every page with error 500.
    3. With -WithNode: installs ARR and enables its proxy, and checks that Node.js is installed.
    4. Checks the HTTPS bindings: the certificate must cover mgiclook.com and www.mgiclook.com.
  It does not change the site's files, its bindings or its certificate.
#>
param(
  [switch] $WithNode,
  [string] $MsiFolder = '',
  [string] $SiteName = ''
)

$ErrorActionPreference = 'Stop'
$Domains = @('mgiclook.com', 'www.mgiclook.com')

$Downloads = @{
  UrlRewrite = @{
    File = 'rewrite_amd64_en-US.msi'
    Url  = 'https://download.microsoft.com/download/1/2/8/128E2E22-C1B9-44A4-BE2A-5859ED1D4592/rewrite_amd64_en-US.msi'
    Page = 'https://www.iis.net/downloads/microsoft/url-rewrite'
  }
  Arr = @{
    File = 'requestRouter_amd64.msi'
    Url  = 'https://download.microsoft.com/download/E/9/8/E9849D6A-020E-47E4-9FD0-A023E99B54EB/requestRouter_amd64.msi'
    Page = 'https://www.iis.net/downloads/microsoft/application-request-routing'
  }
}

$problems = New-Object System.Collections.Generic.List[string]
function Step($message) { Write-Host "`n==> $message" -ForegroundColor Cyan }
function Ok($message) { Write-Host "    OK  $message" -ForegroundColor Green }
function Warn($message) { Write-Host "    !!  $message" -ForegroundColor Yellow; $problems.Add($message) }

# --- Checks before starting ---------------------------------------------------------------------
$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw 'Run PowerShell as administrator (right-click > Run as administrator), then run this script again.'
}
if (-not [Environment]::Is64BitOperatingSystem) { throw 'This script installs the 64-bit modules; the server is 32-bit.' }

$inetsrv = Join-Path $env:SystemRoot 'System32\inetsrv'
$appcmd = Join-Path $inetsrv 'appcmd.exe'

# --- 1. IIS features ----------------------------------------------------------------------------
Step 'IIS features'
$isServer = $null -ne (Get-Command Install-WindowsFeature -ErrorAction SilentlyContinue)
if ($isServer) {
  $features = 'Web-Server', 'Web-Static-Content', 'Web-Default-Doc', 'Web-Http-Errors',
              'Web-Stat-Compression', 'Web-Filtering', 'Web-Mgmt-Console'
  $missing = @($features | Where-Object { -not (Get-WindowsFeature $_).Installed })
  if ($missing.Count -eq 0) { Ok 'already installed' }
  else {
    Write-Host "    installing: $($missing -join ', ')"
    $result = Install-WindowsFeature -Name $missing
    if (-not $result.Success) { throw 'Installing the IIS features failed. See the messages above.' }
    Ok 'installed'
    if ($result.RestartNeeded -eq 'Yes') { Warn 'Windows asks for a restart to finish installing IIS. Restart, then run this script again.' }
  }
} else {
  # Windows 10/11 (not Windows Server): the same features under their optional-feature names.
  $features = 'IIS-WebServerRole', 'IIS-WebServer', 'IIS-CommonHttpFeatures', 'IIS-StaticContent',
              'IIS-DefaultDocument', 'IIS-HttpErrors', 'IIS-Performance', 'IIS-HttpCompressionStatic',
              'IIS-Security', 'IIS-RequestFiltering', 'IIS-WebServerManagementTools', 'IIS-ManagementConsole'
  $missing = @($features | Where-Object { (Get-WindowsOptionalFeature -Online -FeatureName $_).State -ne 'Enabled' })
  if ($missing.Count -eq 0) { Ok 'already installed' }
  else {
    Write-Host "    installing: $($missing -join ', ')"
    Enable-WindowsOptionalFeature -Online -FeatureName $missing -All -NoRestart | Out-Null
    Ok 'installed'
  }
}
if (-not (Test-Path $appcmd)) { throw "IIS is not ready ($appcmd is missing). Restart Windows and run this script again." }

# --- Helpers for the MSI modules ----------------------------------------------------------------
function Get-Msi($item) {
  if ($MsiFolder) {
    $local = Join-Path $MsiFolder $item.File
    if (-not (Test-Path $local)) { throw "Not found: $local. Download it from $($item.Page)" }
    return $local
  }
  $target = Join-Path $env:TEMP $item.File
  Write-Host "    downloading $($item.File) from Microsoft"
  [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
  try {
    $ProgressPreference = 'SilentlyContinue'
    Invoke-WebRequest -Uri $item.Url -OutFile $target -UseBasicParsing
  } catch {
    throw "Download failed ($($_.Exception.Message)). Download $($item.File) from $($item.Page) into a folder, then run: .\install-prerequisites.ps1 -MsiFolder <that folder>"
  }
  return $target
}

function Install-Msi($item, $label) {
  $msi = Get-Msi $item
  $signature = Get-AuthenticodeSignature $msi
  if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch 'O=Microsoft Corporation') {
    throw "$($item.File) is not signed by Microsoft (signature: $($signature.Status)). It was not installed. Download it again from $($item.Page)"
  }
  $log = Join-Path $env:TEMP ($item.File + '.log')
  Write-Host "    installing $label"
  $process = Start-Process msiexec.exe -ArgumentList @('/i', "`"$msi`"", '/qn', '/norestart', '/l*v', "`"$log`"") -Wait -PassThru
  switch ($process.ExitCode) {
    0 { Ok "$label installed" }
    3010 { Ok "$label installed"; Warn "Windows asks for a restart to finish installing $label." }
    1638 { Ok "$label is already installed (another version)" }
    default { throw "Installing $label failed (msiexec code $($process.ExitCode)). Log: $log" }
  }
}

function Test-ConfigSection($section) {
  & $appcmd list config "-section:$section" *> $null
  return $LASTEXITCODE -eq 0
}

# --- 2. URL Rewrite -----------------------------------------------------------------------------
Step 'URL Rewrite module (redirects, HSTS)'
if ((Test-Path (Join-Path $inetsrv 'rewrite.dll')) -and (Test-ConfigSection 'system.webServer/rewrite/rules')) {
  Ok 'already installed'
} else {
  Install-Msi $Downloads.UrlRewrite 'URL Rewrite'
  if (-not (Test-ConfigSection 'system.webServer/rewrite/rules')) {
    Warn 'URL Rewrite was installed but IIS does not see it yet. Run "iisreset", then run this script again.'
  }
}

# --- 3. ARR and Node.js (only for the Node version) ---------------------------------------------
if ($WithNode) {
  Step 'Application Request Routing (proxy to Node.js)'
  if (Test-ConfigSection 'system.webServer/proxy') { Ok 'already installed' }
  else {
    Install-Msi $Downloads.Arr 'Application Request Routing'
  }
  if (Test-ConfigSection 'system.webServer/proxy') {
    & $appcmd set config -section:system.webServer/proxy /enabled:"True" /commit:apphost | Out-Null
    if ($LASTEXITCODE -eq 0) { Ok 'proxy enabled' } else { Warn 'Could not enable the ARR proxy: IIS Manager > server > Application Request Routing Cache > Server Proxy Settings > Enable proxy.' }
  } else {
    Warn 'ARR was installed but IIS does not see it yet. Run "iisreset", then run this script again.'
  }

  Step 'Node.js'
  $node = Get-Command node -ErrorAction SilentlyContinue
  if ($node) {
    $version = (& node --version).Trim()
    if ([int]($version.TrimStart('v').Split('.')[0]) -ge 22) { Ok "Node.js $version" }
    else { Warn "Node.js $version is too old: install Node.js 22 LTS or newer from https://nodejs.org (Windows x64 .msi)." }
  } else {
    Warn 'Node.js is not installed: install Node.js 22 LTS or newer from https://nodejs.org (Windows x64 .msi).'
  }
}

# --- 4. HTTPS bindings and certificate ----------------------------------------------------------
Step 'HTTPS bindings and certificate'
Import-Module WebAdministration -ErrorAction SilentlyContinue
if (-not (Get-Command Get-WebBinding -ErrorAction SilentlyContinue)) {
  Warn 'Could not read the IIS bindings (the WebAdministration module is missing). Check them in IIS Manager.'
} else {
  function Test-Covers($names, $domain) {
    foreach ($name in $names) {
      if ($name -ieq $domain) { return $true }
      if ($name.StartsWith('*.') -and $domain -like "*.$($name.Substring(2))" -and ($domain.Split('.').Count -eq $name.Split('.').Count)) { return $true }
    }
    return $false
  }
  $sites = @(Get-Website | Where-Object { -not $SiteName -or $_.Name -eq $SiteName })
  if ($sites.Count -eq 0) { Warn "No IIS site found$(if ($SiteName) { " named '$SiteName'" })." }
  $covered = @{}
  foreach ($site in $sites) {
    $bindings = @(Get-WebBinding -Name $site.Name)
    Write-Host "    site '$($site.Name)' ($($site.State)), folder $($site.PhysicalPath)"
    foreach ($binding in $bindings) { Write-Host "      $($binding.protocol)  $($binding.bindingInformation)" }
    foreach ($binding in ($bindings | Where-Object { $_.protocol -eq 'https' })) {
      $hash = $binding.certificateHash
      if (-not $hash) { Warn "Site '$($site.Name)': https binding $($binding.bindingInformation) has no certificate."; continue }
      $store = if ($binding.certificateStoreName) { $binding.certificateStoreName } else { 'My' }
      $cert = Get-Item "Cert:\LocalMachine\$store\$hash" -ErrorAction SilentlyContinue
      if (-not $cert) { Warn "Site '$($site.Name)': the certificate $hash was not found in LocalMachine\$store."; continue }
      $names = @($cert.DnsNameList | ForEach-Object { $_.Unicode })
      Write-Host "      certificate: $($names -join ', ')  (expires $($cert.NotAfter.ToString('yyyy-MM-dd')))"
      if ($cert.NotAfter -lt (Get-Date).AddDays(21)) { Warn "The certificate for $($names -join ', ') expires on $($cert.NotAfter.ToString('yyyy-MM-dd')): renew it." }
      foreach ($domain in $Domains) { if (Test-Covers $names $domain) { $covered[$domain] = $true } }
    }
  }
  foreach ($domain in $Domains) {
    if ($covered[$domain]) { Ok "$domain is covered by a certificate" }
    else { Warn "No HTTPS certificate on this server covers $domain. Visitors to https://$domain get a certificate error before the redirect can happen." }
  }
}

# --- Summary ------------------------------------------------------------------------------------
Write-Host ''
if ($problems.Count -eq 0) {
  Write-Host 'Done: the server is ready. Copy the release folder (with its web.config) into the site folder.' -ForegroundColor Green
} else {
  Write-Host "Done, with $($problems.Count) thing(s) to fix:" -ForegroundColor Yellow
  $problems | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
}
