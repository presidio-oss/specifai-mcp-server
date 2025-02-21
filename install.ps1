# Installation script for specif-ai-mcp-server (Windows PowerShell)

# Script parameters
param(
    [string]$v = "",     # Version parameter
    [switch]$h = $false  # Help parameter
)

# Repository information
$RepoOwner = "vj-presidio"
$RepoName = "specif-ai-mcp-server"
$BinaryName = "specif-ai-mcp-server"
$InstallDir = "$env:ProgramFiles\specif-ai"

# Colors for output
$Green = "Green"
$Red = "Red"
$Blue = "Cyan"

# Show help
function Show-Help {
    Write-Host "Usage: install.ps1 [-v version]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -v version    Install specific version"
    Write-Host "  -h            Show this help message"
    exit 0
}

# Show help if requested
if ($h) {
    Show-Help
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

# Main installation flow
function Install-Main {
    # Determine version to install
    if ([string]::IsNullOrEmpty($v)) {
        Write-Host "No version specified, getting latest..." -ForegroundColor $Blue
        $Version = Get-LatestVersion
    }
    else {
        $Version = $v
        Write-Host "Checking if version v$Version exists..." -ForegroundColor $Blue
        if (-not (Test-VersionExists $Version)) {
            Write-Host "Error: Version v$Version not found" -ForegroundColor $Red
            exit 1
        }
    }
    
    # Download and install binary
    $TempFile = Get-Binary $Version
    Install-Binary $TempFile
    
    # Cleanup
    Remove-Item -Recurse -Force (Split-Path $TempFile)
    
    Write-Host "Successfully installed $BinaryName v$Version" -ForegroundColor $Green
    Write-Host "Run '$BinaryName --help' to get started" -ForegroundColor $Blue
}

# Run main installation
Install-Main
