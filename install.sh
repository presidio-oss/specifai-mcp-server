#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default installation directory
INSTALL_DIR="/usr/local/bin"
WINDOWS_INSTALL_DIR="C:\\Program Files\\specif-ai"

# Repository information
REPO_OWNER="vj-presidio"
REPO_NAME="specif-ai-mcp-server"
BINARY_NAME="specif-ai-mcp-server"

# Parse command line arguments
VERSION=""
while getopts "v:" opt; do
    case $opt in
        v) VERSION="$OPTARG";;
        \?) echo "Invalid option: -$OPTARG" >&2; exit 1;;
    esac
done

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to get OS and architecture
get_os_arch() {
    OS=$(uname -s | tr '[:upper:]' '[:lower:]')
    ARCH=$(uname -m)
    
    # Convert architecture names
    case "$ARCH" in
        x86_64) ARCH="x64" ;;
        aarch64) ARCH="arm64" ;;
        armv7l) ARCH="arm" ;;
    esac
    
    # Convert OS names and determine variant
    case "$OS" in
        darwin) 
            OS="darwin"
            VARIANT=""
            ;;
        linux) 
            OS="linux"
            # Default to modern, fallback to baseline if not supported
            if [ "$ARCH" = "x64" ]; then
                if grep -q "lm_required" /proc/cpuinfo 2>/dev/null; then
                    VARIANT="-modern"
                else
                    VARIANT="-baseline"
                fi
            else
                VARIANT=""
            fi
            ;;
        msys*|mingw*) 
            OS="windows"
            # Default to modern, fallback to baseline
            if [ "$ARCH" = "x64" ]; then
                VARIANT="-modern"
            else
                VARIANT=""
            fi
            ;;
        *) 
            echo "Unsupported OS: $OS" >&2
            exit 1 
            ;;
    esac
    
    echo "$OS $ARCH $VARIANT"
}

# Function to get latest version from GitHub
get_latest_version() {
    if ! command_exists curl; then
        echo "Error: curl is required but not installed." >&2
        exit 1
    fi
    
    if ! command_exists jq; then
        echo "Error: jq is required but not installed." >&2
        exit 1
    }
    
    LATEST_VERSION=$(curl -s "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/releases/latest" | jq -r .tag_name)
    if [ -z "$LATEST_VERSION" ] || [ "$LATEST_VERSION" = "null" ]; then
        echo "Error: Could not determine latest version" >&2
        exit 1
    fi
    echo "$LATEST_VERSION"
}

# Function to check if version exists
check_version_exists() {
    VERSION=$1
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/releases/tags/v${VERSION}")
    if [ "$HTTP_CODE" != "200" ]; then
        echo "Error: Version v${VERSION} not found" >&2
        exit 1
    fi
}

# Function to download binary
download_binary() {
    VERSION=$1
    read -r OS ARCH <<< "$(get_os_arch)"
    
    # Get OS info
    read -r OS ARCH VARIANT <<< "$(get_os_arch)"
    
    # Construct binary name based on OS
    if [ "$OS" = "windows" ]; then
        BINARY_SUFFIX=".exe"
    else
        BINARY_SUFFIX=""
    fi
    
    DOWNLOAD_URL="https://github.com/$REPO_OWNER/$REPO_NAME/releases/download/v${VERSION}/${BINARY_NAME}-${OS}-${ARCH}${VARIANT}-v${VERSION}${BINARY_SUFFIX}"
    
    echo -e "${BLUE}Downloading ${BINARY_NAME} v${VERSION} for ${OS}-${ARCH}...${NC}"
    
    # Create temp directory
    TMP_DIR=$(mktemp -d)
    TMP_FILE="${TMP_DIR}/${BINARY_NAME}${BINARY_SUFFIX}"
    
    # Download binary
    if ! curl -L -o "$TMP_FILE" "$DOWNLOAD_URL"; then
        echo -e "${RED}Error: Failed to download binary${NC}" >&2
        rm -rf "$TMP_DIR"
        exit 1
    fi
    
    echo "$TMP_FILE"
}

# Function to install binary
install_binary() {
    TMP_FILE=$1
    read -r OS ARCH <<< "$(get_os_arch)"
    
    if [ "$OS" = "windows" ]; then
        # Windows installation
        mkdir -p "$WINDOWS_INSTALL_DIR"
        mv "$TMP_FILE" "$WINDOWS_INSTALL_DIR\\${BINARY_NAME}.exe"
        
        # Add to PATH if not already there
        if ! echo "$PATH" | grep -q "$WINDOWS_INSTALL_DIR"; then
            setx PATH "%PATH%;$WINDOWS_INSTALL_DIR"
        fi
    else
        # Unix installation
        if [ ! -d "$INSTALL_DIR" ]; then
            echo -e "${RED}Error: Installation directory $INSTALL_DIR does not exist${NC}" >&2
            exit 1
        fi
        
        # Move binary to installation directory
        if ! sudo mv "$TMP_FILE" "$INSTALL_DIR/${BINARY_NAME}"; then
            echo -e "${RED}Error: Failed to install binary${NC}" >&2
            exit 1
        fi
        
        # Set executable permissions
        sudo chmod +x "$INSTALL_DIR/${BINARY_NAME}"
    fi
}

# Main installation flow
main() {
    # Determine version to install
    if [ -z "$VERSION" ]; then
        echo -e "${BLUE}No version specified, getting latest...${NC}"
        VERSION=$(get_latest_version)
    else
        echo -e "${BLUE}Checking if version v${VERSION} exists...${NC}"
        check_version_exists "$VERSION"
    fi
    
    # Remove v prefix if present
    VERSION="${VERSION#v}"
    
    # Download and install binary
    TMP_FILE=$(download_binary "$VERSION")
    install_binary "$TMP_FILE"
    
    # Cleanup
    rm -rf "$(dirname "$TMP_FILE")"
    
    echo -e "${GREEN}Successfully installed ${BINARY_NAME} v${VERSION}${NC}"
    echo -e "${BLUE}Run '${BINARY_NAME} --help' to get started${NC}"
}

# Run main installation
main
