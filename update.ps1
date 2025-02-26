# Update script for specifai-mcp-server (Windows PowerShell)

# Script parameters
param(
    [string]$v = "",     # Version parameter
    [switch]$c = $false, # Check only parameter
    [switch]$h = $false  # Help parameter
)

# Repository information
$RepoOwner = "vj-presidio"
$RepoName = "specifai-mcp-server"
$BinaryName = "specifai-mcp-server"
$InstallDir = "$env:ProgramFiles\specif-ai"

# Colors for output
$Green = "Green"
$Red = "Red"
$Blue = "Cyan"

# Show help
function Show-Help {
    Write-Host "Usage: update.ps1 [-v version] [-c]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -v version    Update to specific version"
    Write-Host "  -c           Check for updates only"
    Write-Host "  -h           Show this help message"
    exit 0
}

# Show help if requested
if ($h) {
    Show-Help
}

# Function to get current version
function Get-CurrentVersion {
    $BinaryPath = Join-Path $InstallDir "$BinaryName.exe"
    if (-not (Test-Path $BinaryPath)) {
        Write-Host "Error: $BinaryName is not installed" -ForegroundColor $Red
        exit 1
    }
    
    try {
        $Version = & $BinaryPath --version
        if ($Version -match '\d+\.\d+\.\d+') {
            return $Matches[0]
        }
        Write-Host "Error: Could not determine current version" -ForegroundColor $Red
        exit 1
    }
    catch {
        Write-Host "Error: Could not determine current version" -ForegroundColor $Red
        exit 1
    }
}

# Function to get latest version from GitHub
function Get-LatestVersion {
    try {
        $response = Invoke-RestMethod -Uri "https://api.github.com/repos/$RepoOwner/$RepoName/releases/latest"
        return $response.tag_name -replace '^v', ''
    }
    catch {
        Write-Host "Error: Could not determine latest version" -ForegroundColor $Red
        exit 1
    }
}

# Function to check if version exists
function Test-VersionExists {
    param([string]$Version)
    
    try {
        $response = Invoke-RestMethod -Uri "https://api.github.com/repos/$RepoOwner/$RepoName/releases/tags/v$Version" -ErrorAction SilentlyContinue
        return $true
    }
    catch {
        return $false
    }
}

# Function to compare versions
function Compare-Versions {
    param(
        [string]$Version1,
        [string]$Version2
    )
    
    $v1 = [version]$Version1
    $v2 = [version]$Version2
    
    return $v1.CompareTo($v2)
}

# Function to download binary
function Get-Binary {
    param([string]$Version)
    
    # Determine CPU variant
    $Variant = "-modern"
    try {
        # Check if CPU supports modern features
        $CpuInfo = Get-WmiObject -Class Win32_Processor
        if (-not ($CpuInfo.Caption -match "Intel|AMD")) {
            $Variant = "-baseline"
        }
    } catch {
        # Fallback to baseline if can't determine
        $Variant = "-baseline"
    }
    
    # Create temp directory
    $TempDir = New-TemporaryFile | ForEach-Object { Remove-Item $_; New-Item -ItemType Directory -Path $_ }
    $TempFile = Join-Path $TempDir "$BinaryName.exe"
    
    # Construct download URL
    $DownloadUrl = "https://github.com/$RepoOwner/$RepoName/releases/download/v$Version/$BinaryName-windows-x64$Variant-v$Version.exe"
    
    Write-Host "Downloading $BinaryName v$Version..." -ForegroundColor $Blue
    
    try {
        Invoke-WebRequest -Uri $DownloadUrl -OutFile $TempFile
        return $TempFile
    }
    catch {
        Write-Host "Error: Failed to download binary" -ForegroundColor $Red
        Remove-Item -Recurse -Force $TempDir
        exit 1
    }
}

# Function to install binary
function Install-Binary {
    param([string]$TempFile)
    
    # Create installation directory if it doesn't exist
    if (-not (Test-Path $InstallDir)) {
        New-Item -ItemType Directory -Path $InstallDir | Out-Null
    }
    
    # Move binary to installation directory
    $TargetPath = Join-Path $InstallDir "$BinaryName.exe"
    Move-Item -Force $TempFile $TargetPath
    
    # Add to PATH if not already there
    $CurrentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
    if ($CurrentPath -notlike "*$InstallDir*") {
        $NewPath = "$CurrentPath;$InstallDir"
        [Environment]::SetEnvironmentVariable("Path", $NewPath, "Machine")
        $env:Path = $NewPath
    }
}

# Main update flow
function Update-Main {
    $CurrentVersion = Get-CurrentVersion
    
    # Determine target version
    if ([string]::IsNullOrEmpty($v)) {
        $TargetVersion = Get-LatestVersion
    }
    else {
        $TargetVersion = $v
        Write-Host "Checking if version v$TargetVersion exists..." -ForegroundColor $Blue
        if (-not (Test-VersionExists $TargetVersion)) {
            Write-Host "Error: Version v$TargetVersion not found" -ForegroundColor $Red
            exit 1
        }
    }
    
    # Compare versions
    if ($CurrentVersion -eq $TargetVersion) {
        Write-Host "Already running latest version v$CurrentVersion" -ForegroundColor $Green
        exit 0
    }
    
    $VersionComparison = Compare-Versions $TargetVersion $CurrentVersion
    if ($VersionComparison -lt 0) {
        Write-Host "Target version v$TargetVersion is older than current version v$CurrentVersion" -ForegroundColor $Red
        exit 1
    }
    
    # If check only, exit here
    if ($c) {
        Write-Host "Update available: v$CurrentVersion -> v$TargetVersion" -ForegroundColor $Blue
        Write-Host "Run without -c flag to update" -ForegroundColor $Blue
        exit 0
    }
    
    # Download and install binary
    Write-Host "Updating from v$CurrentVersion to v$TargetVersion..." -ForegroundColor $Blue
    $TempFile = Get-Binary $TargetVersion
    Install-Binary $TempFile
    
    # Cleanup
    Remove-Item -Recurse -Force (Split-Path $TempFile)
    
    Write-Host "Successfully updated to v$TargetVersion" -ForegroundColor $Green
}

# Run main update flow
Update-Main
