<#
.SYNOPSIS
  Prepares a Windows server (IIS) to host the Magic Look static site (release\iis-site-* folders).

.DESCRIPTION
  FOR A NEW SERVER. On the server that already hosts mgiclook.com, use install-prerequisites.ps1
  (it only installs IIS features and URL Rewrite and does not touch the sites); this script stops
  by itself if it finds the site's host names already bound on another IIS site.

  Run once on the server, in PowerShell "Run as Administrator". Safe to run again: every step
  checks first and skips what is already in place.

    1. Installs IIS with only the features the site's web.config uses
       (static files, default document, custom errors, static compression, logging, IIS Manager).
    2. Installs the IIS "URL Rewrite 2.1" module (needed by web.config: without it every page is error 500).
       The installer is downloaded from Microsoft and its Microsoft digital signature is checked before it runs.
       Offline server: download it yourself and pass -RewriteMsi <path>.
    3. Creates the site folder, an application pool (no .NET) and the IIS site with HTTP bindings
       for mgiclook.com, www.mgiclook.com and magiclook.com / www.magiclook.com.
    4. Optional: copies a release folder into the site (-SiteSource).
    5. Optional: adds the HTTPS binding (port 443, SNI) for a certificate already in the machine store
       (-CertThumbprint). Without it the script prints how to get a free certificate with win-acme.
    6. Opens ports 80 and 443 in Windows Firewall and checks that the site answers.

.EXAMPLE
  .\install-server.ps1

.EXAMPLE
  .\install-server.ps1 -SiteSource D:\upload\iis-site-2026-11-28

.EXAMPLE
  .\install-server.ps1 -SiteSource D:\upload\iis-site-2026-11-28 -CertThumbprint 0123ABCD...
#>
[CmdletBinding()]
param(
    [string]   $SiteName       = 'MagicLook',
    [string]   $SitePath       = 'C:\sites\magic-look-static',
    [string[]] $HostNames      = @('mgiclook.com', 'www.mgiclook.com', 'magiclook.com', 'www.magiclook.com'),
    [string]   $SiteSource     = '',
    [switch]   $Mirror,
    [string]   $CertThumbprint = '',
    [string]   $RewriteMsi     = '',
    [string]   $RewriteUrl     = 'https://download.microsoft.com/download/1/2/8/128E2E22-C1B9-44A4-BE2A-5859ED1D4592/rewrite_amd64_en-US.msi',
    [switch]   $KeepDefaultSite
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2.0

function Write-Step([string]$text) { Write-Host ''; Write-Host "==> $text" -ForegroundColor Cyan }
function Write-Ok([string]$text)   { Write-Host "    OK: $text" -ForegroundColor Green }
function Write-Note([string]$text) { Write-Host "    $text" -ForegroundColor Yellow }

# ---------------------------------------------------------------- 0. checks
$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Run this script in PowerShell opened with "Run as Administrator".'
}
if (-not [Environment]::Is64BitOperatingSystem) { throw 'A 64-bit Windows is required.' }

$isServer = (Get-CimInstance Win32_OperatingSystem).ProductType -ne 1
Write-Host "Magic Look - IIS setup on $env:COMPUTERNAME ($(if ($isServer) {'Windows Server'} else {'Windows client'}))"

# ---------------------------------------------------------------- 1. IIS
Write-Step 'Installing IIS features'
if ($isServer) {
    $features = @(
        'Web-Server', 'Web-WebServer', 'Web-Common-Http', 'Web-Default-Doc', 'Web-Static-Content',
        'Web-Http-Errors', 'Web-Http-Logging', 'Web-Stat-Compression', 'Web-Filtering', 'Web-Mgmt-Console'
    )
    $missing = @($features | Where-Object { -not (Get-WindowsFeature $_).Installed })
    if ($missing.Count -gt 0) {
        $result = Install-WindowsFeature -Name $missing
        if (-not $result.Success) { throw "IIS feature install failed: $($missing -join ', ')" }
        if ($result.RestartNeeded -eq 'Yes') { Write-Note 'Windows asks for a restart. Restart, then run this script again.' }
        Write-Ok "installed $($missing -join ', ')"
    } else { Write-Ok 'already installed' }
} else {
    $features = @(
        'IIS-WebServerRole', 'IIS-WebServer', 'IIS-CommonHttpFeatures', 'IIS-DefaultDocument', 'IIS-StaticContent',
        'IIS-HttpErrors', 'IIS-HttpLogging', 'IIS-HttpCompressionStatic', 'IIS-RequestFiltering', 'IIS-ManagementConsole'
    )
    $missing = @($features | Where-Object { (Get-WindowsOptionalFeature -Online -FeatureName $_).State -ne 'Enabled' })
    if ($missing.Count -gt 0) {
        Enable-WindowsOptionalFeature -Online -FeatureName $missing -All -NoRestart | Out-Null
        Write-Ok "enabled $($missing -join ', ')"
    } else { Write-Ok 'already enabled' }
}

# ---------------------------------------------------------------- 2. URL Rewrite
Write-Step 'Installing IIS URL Rewrite module'
$rewriteDll = Join-Path $env:windir 'System32\inetsrv\rewrite.dll'
if (Test-Path $rewriteDll) {
    Write-Ok 'already installed'
} else {
    if ($RewriteMsi -eq '') {
        $RewriteMsi = Join-Path $env:TEMP 'rewrite_amd64_en-US.msi'
        Write-Host "    downloading $RewriteUrl"
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $RewriteUrl -OutFile $RewriteMsi -UseBasicParsing
    }
    if (-not (Test-Path $RewriteMsi)) { throw "Installer not found: $RewriteMsi" }

    $sig = Get-AuthenticodeSignature $RewriteMsi
    if ($sig.Status -ne 'Valid' -or $sig.SignerCertificate.Subject -notmatch 'O=Microsoft Corporation') {
        throw "The URL Rewrite installer is not validly signed by Microsoft (status: $($sig.Status)). Not installing it."
    }
    Write-Ok 'installer signed by Microsoft'

    $log = Join-Path $env:TEMP 'rewrite-install.log'
    $p = Start-Process msiexec.exe -ArgumentList @('/i', "`"$RewriteMsi`"", '/qn', '/norestart', '/l*v', "`"$log`"") -Wait -PassThru
    if ($p.ExitCode -notin 0, 3010) { throw "URL Rewrite install failed (exit $($p.ExitCode)). Log: $log" }
    if (-not (Test-Path $rewriteDll)) { throw "URL Rewrite did not install. Log: $log" }
    Write-Ok 'installed'
}

Import-Module WebAdministration

# ---------------------------------------------------------------- 3. site
Write-Step "Creating the IIS site '$SiteName'"
# This script is for a NEW server. On a server that already serves the site, stop before touching it:
# a second site with the same host names would not start, and stopping "Default Web Site" could take the live site down.
$taken = @(Get-Website | Where-Object { $_.Name -ne $SiteName } | ForEach-Object {
    $other = $_
    Get-WebBinding -Name $other.Name | Where-Object { $HostNames -contains (($_.bindingInformation -split ':')[2]) } |
        ForEach-Object { "$($other.Name): $($_.protocol) $($_.bindingInformation)" }
})
if ($taken.Count -gt 0) {
    throw ("These host names are already served by another IIS site:`n  " + ($taken -join "`n  ") +
        "`nThis server already hosts the site. Run install-prerequisites.ps1 instead, then copy the release into that site's folder.")
}
if (-not $KeepDefaultSite -and (Get-Website -Name 'Default Web Site' -ErrorAction SilentlyContinue)) {
    $defaultPath = [Environment]::ExpandEnvironmentVariables((Get-Website -Name 'Default Web Site').PhysicalPath)
    if (Test-Path (Join-Path $defaultPath 'index.html')) {
        throw ("'Default Web Site' serves a website ($defaultPath has index.html), so it was not stopped." +
            "`nIf that is the live site, run install-prerequisites.ps1 instead. Otherwise run again with -KeepDefaultSite or empty that folder.")
    }
}
if (-not (Test-Path $SitePath)) { New-Item -ItemType Directory -Path $SitePath | Out-Null; Write-Ok "created $SitePath" }

$poolPath = "IIS:\AppPools\$SiteName"
if (-not (Test-Path $poolPath)) {
    New-WebAppPool -Name $SiteName | Out-Null
    Write-Ok "created application pool $SiteName"
}
Set-ItemProperty $poolPath -Name managedRuntimeVersion -Value ''      # static files only: no .NET
Set-ItemProperty $poolPath -Name startMode -Value 'OnDemand'

# The pool identity only needs to read the site folder.
$acl = Get-Acl $SitePath
$rule = New-Object Security.AccessControl.FileSystemAccessRule("IIS AppPool\$SiteName", 'ReadAndExecute', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
$acl.AddAccessRule($rule); Set-Acl $SitePath $acl

if (-not $KeepDefaultSite -and (Get-Website -Name 'Default Web Site' -ErrorAction SilentlyContinue)) {
    $default = Get-Website -Name 'Default Web Site'
    if ($default.State -eq 'Started') { Stop-Website -Name 'Default Web Site'; Write-Ok 'stopped "Default Web Site" (it holds port 80)' }
    Set-ItemProperty 'IIS:\Sites\Default Web Site' -Name serverAutoStart -Value $false
}

if (-not (Get-Website -Name $SiteName -ErrorAction SilentlyContinue)) {
    New-Website -Name $SiteName -PhysicalPath $SitePath -ApplicationPool $SiteName -Port 80 -HostHeader $HostNames[0] | Out-Null
    Write-Ok "created site $SiteName -> $SitePath"
} else {
    Set-ItemProperty "IIS:\Sites\$SiteName" -Name physicalPath -Value $SitePath
    Set-ItemProperty "IIS:\Sites\$SiteName" -Name applicationPool -Value $SiteName
    Write-Ok 'site exists, path and pool updated'
}
foreach ($h in $HostNames) {
    if (-not (Get-WebBinding -Name $SiteName -Protocol http -Port 80 -HostHeader $h)) {
        New-WebBinding -Name $SiteName -Protocol http -Port 80 -HostHeader $h
        Write-Ok "binding http://$h"
    }
}

# ---------------------------------------------------------------- 4. content
if ($SiteSource -ne '') {
    Write-Step "Copying the site from $SiteSource"
    if (-not (Test-Path (Join-Path $SiteSource 'index.html'))) { throw "No index.html in $SiteSource - is this a release\iis-site-* folder?" }
    if (-not (Test-Path (Join-Path $SiteSource 'web.config')))  { throw "No web.config in $SiteSource." }
    $rcArgs = @($SiteSource, $SitePath, '/XF', 'dashboard.html', '/R:2', '/W:2', '/NFL', '/NDL', '/NP')
    if ($Mirror) { $rcArgs = @($SiteSource, $SitePath, '/MIR') + $rcArgs[2..($rcArgs.Count - 1)] } else { $rcArgs += '/E' }
    & robocopy.exe @rcArgs | Out-Null
    if ($LASTEXITCODE -ge 8) { throw "robocopy failed (exit $LASTEXITCODE)." }
    $files = Get-ChildItem $SitePath -Recurse -File
    Write-Ok ("{0} files, {1:N1} MB in {2}" -f $files.Count, (($files | Measure-Object Length -Sum).Sum / 1MB), $SitePath)
    if (Test-Path (Join-Path $SitePath 'dashboard.html')) { Write-Note 'dashboard.html is in the site folder: delete it, the static site must not serve it.' }
} elseif (-not (Test-Path (Join-Path $SitePath 'index.html'))) {
    Write-Note "The site folder is empty. Copy the contents of release\iis-site-<date> into $SitePath (or run again with -SiteSource)."
}

# ---------------------------------------------------------------- 5. HTTPS
Write-Step 'HTTPS'
if ($CertThumbprint -ne '') {
    $thumb = ($CertThumbprint -replace '[^0-9A-Fa-f]', '').ToUpper()
    $cert = Get-Item "Cert:\LocalMachine\My\$thumb" -ErrorAction SilentlyContinue
    if (-not $cert) { throw "No certificate with thumbprint $thumb in Local Machine > Personal." }
    foreach ($h in $HostNames) {
        $covered = $cert.DnsNameList.Unicode -contains $h
        if (-not $covered) { Write-Note "certificate does not cover $h - skipped"; continue }
        if (-not (Get-WebBinding -Name $SiteName -Protocol https -Port 443 -HostHeader $h)) {
            New-WebBinding -Name $SiteName -Protocol https -Port 443 -HostHeader $h -SslFlags 1
        }
        $binding = Get-WebBinding -Name $SiteName -Protocol https -Port 443 -HostHeader $h
        $binding.AddSslCertificate($thumb, 'My')
        Write-Ok "https://$h"
    }
} else {
    Write-Note 'No certificate given. The site redirects to https://mgiclook.com, so it needs one before going live.'
    Write-Note 'Free certificate: download win-acme from https://www.win-acme.com, run wacs.exe as Administrator,'
    Write-Note "choose 'N' (new certificate) and pick the site '$SiteName'. win-acme adds the 443 binding and renews it."
    Write-Note 'The domain must already point (DNS A record) to this server, and port 80 must be reachable.'
}

# ---------------------------------------------------------------- 6. firewall and check
Write-Step 'Firewall'
foreach ($port in 80, 443) {
    $name = "MagicLook HTTP $port"
    if (-not (Get-NetFirewallRule -DisplayName $name -ErrorAction SilentlyContinue)) {
        New-NetFirewallRule -DisplayName $name -Direction Inbound -Protocol TCP -LocalPort $port -Action Allow | Out-Null
    }
    Write-Ok "port $port open"
}

Start-WebAppPool -Name $SiteName -ErrorAction SilentlyContinue
Start-Website -Name $SiteName -ErrorAction SilentlyContinue

Write-Step 'Checking the site'
if (Test-Path (Join-Path $SitePath 'index.html')) {
    try {
        # A request to the main host over http must answer with the 301 redirect to https (web.config works = URL Rewrite works).
        $req = [Net.HttpWebRequest]::Create('http://127.0.0.1/')
        $req.Host = $HostNames[0]; $req.AllowAutoRedirect = $false
        $res = $req.GetResponse(); $code = [int]$res.StatusCode; $loc = $res.Headers['Location']; $res.Close()
        if ($code -eq 301) { Write-Ok "http://$($HostNames[0])/ -> $code $loc" } else { Write-Note "http://$($HostNames[0])/ answered $code (expected 301 to https)" }
    } catch [Net.WebException] {
        $code = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 'no answer' }
        Write-Note "http://$($HostNames[0])/ answered $code. If 500: URL Rewrite is missing or web.config is broken."
    }
} else {
    Write-Note 'Skipped: no site files yet.'
}

Write-Host ''
Write-Host 'Done.' -ForegroundColor Green
Write-Host "Site folder: $SitePath   IIS site: $SiteName"
Write-Host 'To update the site later: run again with -SiteSource <new release folder> (add -Mirror to also remove files that were deleted).'
